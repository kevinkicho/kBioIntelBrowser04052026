/**
 * Claim-rich board packs: fetch 5 extractor-backed Core panels per CID.
 * @see docs/design/discovery-workbench-v2.md §6.5
 */

import type { MoleculeCandidate, Project } from '@/lib/domain'
import type { EvidenceClaim } from '@/lib/domain/entities'
import { fetchCategoryData } from '@/lib/fetchCategory'
import { corePanelsFromProfileData } from '@/lib/evidence/pack'
import {
  dedupeClaimsById,
  extractClaimsFromCorePanels,
  DEFAULT_CLAIM_TOTAL_CAP,
  type CorePanelEvidenceInput,
} from '@/lib/evidence/extractAll'
import type { ClaimExtractorContext } from '@/lib/evidence/context'

/** Categories that host the 5 extractor panels (design §6.5.2). */
const PACK_CATEGORIES = [
  'clinical-safety',
  'bioactivity-targets',
  'molecular-chemical',
] as const

export function selectPackCandidates(project: Project, max = 8): MoleculeCandidate[] {
  const promote = project.candidates.filter((c) => c.boardStatus === 'promote')
  const watching = project.candidates.filter((c) => c.boardStatus === 'watching')
  const withCid = (list: MoleculeCandidate[]) =>
    list.filter((c) => c.identity.pubchemCid != null && c.identity.pubchemCid > 0)
  let pick = withCid(promote)
  if (pick.length === 0) pick = withCid(watching)
  if (pick.length === 0) pick = withCid(project.candidates)
  return pick.slice(0, max)
}

export async function fetchCorePanelsForCid(
  cid: number,
  signal?: AbortSignal,
): Promise<CorePanelEvidenceInput> {
  const merged: Record<string, unknown> = {}
  for (const cat of PACK_CATEGORIES) {
    if (signal?.aborted) break
    try {
      const data = await fetchCategoryData(cid, cat)
      Object.assign(merged, data)
    } catch {
      // skip failed category
    }
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
  claims: EvidenceClaim[]
  claimIds: string[]
  candidatesUsed: MoleculeCandidate[]
  warnings: string[]
}

/**
 * Fetch extractor panels for board candidates and extract claims (cap 200).
 */
export async function buildBoardPackClaims(
  project: Project,
  opts?: { maxCandidates?: number; signal?: AbortSignal },
): Promise<BoardPackClaimsResult> {
  const candidatesUsed = selectPackCandidates(project, opts?.maxCandidates ?? 5)
  const warnings: string[] = []
  if (candidatesUsed.length === 0) {
    return {
      panels: {},
      claims: [],
      claimIds: [],
      candidatesUsed: [],
      warnings: ['No candidates with PubChem CID to fetch Core panels'],
    }
  }

  let panels: CorePanelEvidenceInput = {}
  const allClaims: EvidenceClaim[] = []
  const retrievedAt = new Date().toISOString()

  for (const c of candidatesUsed) {
    if (opts?.signal?.aborted) break
    const cid = c.identity.pubchemCid!
    try {
      const p = await fetchCorePanelsForCid(cid, opts?.signal)
      panels = mergeCorePanels(panels, p)
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
      allClaims.push(...extracted)
    } catch (err) {
      warnings.push(
        `${c.identity.name}: ${err instanceof Error ? err.message : 'panel fetch failed'}`,
      )
    }
  }

  const claims = dedupeClaimsById(allClaims).slice(0, DEFAULT_CLAIM_TOTAL_CAP)
  return {
    panels,
    claims,
    claimIds: claims.map((c) => c.id).slice(0, 50),
    candidatesUsed,
    warnings,
  }
}
