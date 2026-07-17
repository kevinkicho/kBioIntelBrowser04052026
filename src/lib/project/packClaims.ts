/**
 * Claim-rich board packs: fetch 5 extractor-backed Core panels per CID.
 * Parallel budgets: 2 candidates × 2 panels, 8s soft timeout per request.
 * Multi-CID: extract per subject then concat+dedupe (do not re-extract from merged panels).
 * @see docs/design/discovery-workbench-v2.md §6.5
 */

import type { MoleculeCandidate, Project } from '@/lib/domain'
import type { EvidenceClaim } from '@/lib/domain/entities'
import { fetchCategoryData } from '@/lib/fetchCategory'
import type { CategoryId } from '@/lib/categoryConfig'
import { corePanelsFromProfileData } from '@/lib/evidence/pack'
import {
  dedupeClaimsById,
  extractClaimsFromCorePanels,
  countCitableClaims,
  DEFAULT_CLAIM_TOTAL_CAP,
  type CorePanelEvidenceInput,
} from '@/lib/evidence/extractAll'
import type { ClaimExtractorContext } from '@/lib/evidence/context'
import { mapPool } from '@/lib/discovery/identityResolve'
import { withTimeout } from '@/lib/utils'

/** Design §6.5.3 fetch budgets */
export const PACK_MAX_CANDIDATES = 5
export const PACK_CANDIDATE_CONCURRENCY = 2
export const PACK_PANEL_CONCURRENCY = 2
/** Soft timeout per category request (ms); skip panel on fail/timeout. */
export const PACK_PANEL_TIMEOUT_MS = 8000

/** Categories that host the 5 extractor panels (design §6.5.2). */
export const PACK_CATEGORIES: readonly CategoryId[] = [
  'clinical-safety',
  'bioactivity-targets',
  'molecular-chemical',
] as const

/**
 * Heuristic richness for multi-partition fill (v2.1 §7.3.3).
 * Prefer identity + evidence breadth + scores when choosing among same status.
 */
export function richnessProxy(c: MoleculeCandidate): number {
  let score = 0
  if (c.identity.pubchemCid != null && c.identity.pubchemCid > 0) score += 1
  if (c.identity.chemblId) score += 2
  if (c.identity.inchiKey) score += 2
  if (c.scores?.scorePhase === 'full') score += 3
  else if (c.scores) score += 1
  score += Math.min(5, c.evidenceBreadthSources?.length ?? 0)
  const axes = c.scores?.axes
  const axisStatus = c.scores?.axisStatus
  if (axes) {
    for (const k of ['efficacy', 'clinicalStage', 'safety', 'novelty', 'identityTrust'] as const) {
      if (typeof axes[k] === 'number' && axisStatus?.[k] !== 'not-retrieved') score += 0.5
    }
  }
  return score
}

/**
 * Multi-partition fill (v2.1): promote (richness-sorted) then watching then other,
 * still max `max`, CID-only. Replaces exclusive tier fallback.
 */
export function selectPackCandidates(
  project: Project,
  max: number = PACK_MAX_CANDIDATES,
): MoleculeCandidate[] {
  const withCid = (list: MoleculeCandidate[]) =>
    list.filter((c) => c.identity.pubchemCid != null && c.identity.pubchemCid > 0)

  const byRichness = (a: MoleculeCandidate, b: MoleculeCandidate) =>
    richnessProxy(b) - richnessProxy(a)

  const promote = withCid(
    project.candidates.filter((c) => c.boardStatus === 'promote'),
  ).sort(byRichness)
  const watching = withCid(
    project.candidates.filter((c) => c.boardStatus === 'watching'),
  ).sort(byRichness)
  const other = withCid(
    project.candidates.filter(
      (c) => c.boardStatus !== 'promote' && c.boardStatus !== 'watching',
    ),
  ).sort(byRichness)

  const seen = new Set<string>()
  const out: MoleculeCandidate[] = []
  for (const c of [...promote, ...watching, ...other]) {
    if (seen.has(c.candidateId)) continue
    seen.add(c.candidateId)
    out.push(c)
    if (out.length >= max) break
  }
  return out
}

function emptyPanelKeys(panels: CorePanelEvidenceInput): string[] {
  const keys: (keyof CorePanelEvidenceInput)[] = [
    'chemblMechanisms',
    'chemblActivities',
    'clinicalTrials',
    'adverseEvents',
    'diseaseAssociations',
  ]
  const empty: string[] = []
  for (const k of keys) {
    const v = panels[k]
    if (!v || (Array.isArray(v) && v.length === 0)) empty.push(k)
  }
  return empty
}

async function fetchCategorySoft(
  cid: number,
  categoryId: CategoryId,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  if (signal?.aborted) return {}
  try {
    const data = await withTimeout(
      fetchCategoryData(cid, categoryId),
      PACK_PANEL_TIMEOUT_MS,
    )
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/**
 * Fetch extractor Core panels for one CID.
 * Parallel category fetches (concurrency 2), 8s soft timeout each.
 */
export async function fetchCorePanelsForCid(
  cid: number,
  signal?: AbortSignal,
): Promise<CorePanelEvidenceInput> {
  const parts = await mapPool(
    PACK_CATEGORIES,
    PACK_PANEL_CONCURRENCY,
    async (cat) => fetchCategorySoft(cid, cat, signal),
  )
  const merged: Record<string, unknown> = {}
  for (const p of parts) {
    Object.assign(merged, p)
  }
  return corePanelsFromProfileData(merged)
}

function mergeCorePanels(
  into: CorePanelEvidenceInput,
  from: CorePanelEvidenceInput,
): CorePanelEvidenceInput {
  return {
    chemblActivities: [...(into.chemblActivities ?? []), ...(from.chemblActivities ?? [])],
    chemblMechanisms: [...(into.chemblMechanisms ?? []), ...(from.chemblMechanisms ?? [])],
    adverseEvents: [...(into.adverseEvents ?? []), ...(from.adverseEvents ?? [])],
    clinicalTrials: [...(into.clinicalTrials ?? []), ...(from.clinicalTrials ?? [])],
    diseaseAssociations: [
      ...(into.diseaseAssociations ?? []),
      ...(from.diseaseAssociations ?? []),
    ],
  }
}

export interface BoardPackClaimsResult {
  panels: CorePanelEvidenceInput
  /** Pre-extracted multi-subject claims (preferred for pack build). */
  claims: EvidenceClaim[]
  claimIds: string[]
  candidatesUsed: MoleculeCandidate[]
  warnings: string[]
  /** Claims with provenance.source + retrievedAt (M3 citation density). */
  citableCount: number
}

/**
 * Fetch extractor panels for board candidates and extract claims (cap 200).
 * Per-candidate extract then concat+dedupe preserves subjectCandidateId.
 */
export async function buildBoardPackClaims(
  project: Project,
  opts?: {
    maxCandidates?: number
    signal?: AbortSignal
    candidateConcurrency?: number
  },
): Promise<BoardPackClaimsResult> {
  const candidatesUsed = selectPackCandidates(
    project,
    opts?.maxCandidates ?? PACK_MAX_CANDIDATES,
  )
  const warnings: string[] = []
  if (candidatesUsed.length === 0) {
    return {
      panels: {},
      claims: [],
      claimIds: [],
      candidatesUsed: [],
      warnings: ['No candidates with PubChem CID to fetch Core panels'],
      citableCount: 0,
    }
  }

  const retrievedAt = new Date().toISOString()
  const concurrency = opts?.candidateConcurrency ?? PACK_CANDIDATE_CONCURRENCY

  const results = await mapPool(candidatesUsed, concurrency, async (c) => {
    if (opts?.signal?.aborted) {
      return {
        panels: {} as CorePanelEvidenceInput,
        claims: [] as EvidenceClaim[],
        warn: null as string | null,
        empty: [] as string[],
        name: c.identity.name,
      }
    }
    const cid = c.identity.pubchemCid!
    try {
      const p = await fetchCorePanelsForCid(cid, opts?.signal)
      const empty = emptyPanelKeys(p)
      const ctx: ClaimExtractorContext = {
        retrievedAt,
        subjectCandidateId: c.candidateId,
        moleculeName: c.identity.name,
      }
      const extracted = extractClaimsFromCorePanels(p, {
        ...ctx,
        totalCap: DEFAULT_CLAIM_TOTAL_CAP,
        preferFacetOrder: true,
      })
      return {
        panels: p,
        claims: extracted,
        warn: null as string | null,
        empty,
        name: c.identity.name,
      }
    } catch (err) {
      return {
        panels: {} as CorePanelEvidenceInput,
        claims: [] as EvidenceClaim[],
        warn: `${c.identity.name}: ${err instanceof Error ? err.message : 'panel fetch failed'}`,
        empty: [] as string[],
        name: c.identity.name,
      }
    }
  })

  let panels: CorePanelEvidenceInput = {}
  const allClaims: EvidenceClaim[] = []
  for (const r of results) {
    if (r.warn) warnings.push(r.warn)
    if (r.empty.length > 0) {
      warnings.push(
        `${r.name}: empty extractor panels — ${r.empty.join(', ')} (claims may be thin)`,
      )
    }
    if (r.claims.length === 0 && !r.warn) {
      warnings.push(`${r.name}: no claims extracted from Core panels`)
    }
    panels = mergeCorePanels(panels, r.panels)
    allClaims.push(...r.claims)
  }

  const claims = dedupeClaimsById(allClaims).slice(0, DEFAULT_CLAIM_TOTAL_CAP)
  const citableCount = countCitableClaims(claims)

  if (claims.length > 0 && citableCount < Math.min(5, claims.length)) {
    warnings.push(
      `Low citation density: ${citableCount}/${claims.length} claims have source+retrievedAt`,
    )
  }

  return {
    panels,
    claims,
    claimIds: claims.map((c) => c.id).slice(0, 50),
    candidatesUsed,
    warnings,
    citableCount,
  }
}
