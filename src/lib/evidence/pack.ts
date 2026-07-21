/**
 * Versioned evidence packs — download-primary, ≤200 claims, contentHash for cite.
 * Full pack payloads are never written to localStorage (index only — see packIndex.ts).
 * @see docs/design/discovery-workbench-v1.md §3.3, §5.4, PR10
 */

import type {
  DiseaseEntity,
  EvidenceClaim,
  MoleculeCandidate,
  TargetEntity,
} from '@/lib/domain/entities'
import type { ScoreRubric } from '@/lib/domain/score'
import { createDefaultScoreRubric } from '@/lib/domain/score'
import type { DiscoveryPreferencesSnapshot } from '@/lib/discovery/preferences'
import { sha256Hex } from '@/lib/domain/sha256'
import type { ClinicalTrial } from '@/lib/types'
import {
  DEFAULT_CLAIM_TOTAL_CAP,
  claimSourceNames,
  countClaimsByType,
  extractClaimsFromCorePanels,
  type CorePanelEvidenceInput,
  type ExtractAllOptions,
} from './extractAll'

/** Wire schema version for EvidencePack JSON. */
export const EVIDENCE_PACK_SCHEMA_VERSION = 1 as const

/** Design §5.4 — hard claim cap (same as extractAll default). */
export const MAX_PACK_CLAIMS = DEFAULT_CLAIM_TOTAL_CAP

export interface EvidencePack {
  schemaVersion: typeof EVIDENCE_PACK_SCHEMA_VERSION
  id: string
  /** Document revision (starts at 1). */
  version: number
  title: string
  createdAt: string
  /** SHA-256 hex of canonical pack body (excludes contentHash). */
  contentHash: string
  preferencesSnapshot?: DiscoveryPreferencesSnapshot
  disease?: DiseaseEntity | null
  targets: TargetEntity[]
  candidates: MoleculeCandidate[]
  claims: EvidenceClaim[]
  rubric?: ScoreRubric
  projectId?: string
  /** Derived summary fields for quick UI / index. */
  claimCount: number
  claimTypes: Record<string, number>
  sources: string[]
}

export interface BuildEvidencePackInput {
  title: string
  /** Pre-extracted claims (will be capped / re-summarized). */
  claims?: readonly EvidenceClaim[]
  /** When set, claims are extracted via extractClaimsFromCorePanels (preferred). */
  panels?: CorePanelEvidenceInput
  /** Context for extractors when using panels. */
  extractOptions?: ExtractAllOptions
  candidates?: readonly MoleculeCandidate[]
  disease?: DiseaseEntity | null
  targets?: readonly TargetEntity[]
  preferencesSnapshot?: DiscoveryPreferencesSnapshot
  rubric?: ScoreRubric
  projectId?: string
  /** Override id (tests). Default: pack_{time}_{rand} */
  id?: string
  /** Override createdAt (tests). */
  createdAt?: string
  version?: number
  /**
   * Max claims after extract/merge (default 200).
   * Pass null to disable (not recommended for export).
   */
  maxClaims?: number | null
  /** Prefer landscape claims when extracting from panels. */
  landscapeMode?: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

function newPackId(): string {
  return `pack_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Cap claims to max (default 200). Pure.
 */
export function capPackClaims(
  claims: readonly EvidenceClaim[],
  max: number | null = MAX_PACK_CLAIMS,
): EvidenceClaim[] {
  if (max == null || max < 0) return [...claims]
  if (claims.length <= max) return [...claims]
  return claims.slice(0, max)
}

/**
 * Canonical JSON for hashing — stable key order via JSON.stringify of a
 * constructed plain object (insertion order of known fields).
 * Excludes contentHash, claimCount, claimTypes, sources (derived).
 */
export function canonicalizePackBody(
  pack: Omit<EvidencePack, 'contentHash' | 'claimCount' | 'claimTypes' | 'sources'>,
): string {
  const body = {
    schemaVersion: pack.schemaVersion,
    id: pack.id,
    version: pack.version,
    title: pack.title,
    createdAt: pack.createdAt,
    preferencesSnapshot: pack.preferencesSnapshot ?? null,
    disease: pack.disease ?? null,
    targets: pack.targets,
    candidates: pack.candidates,
    claims: pack.claims,
    rubric: pack.rubric ?? null,
    projectId: pack.projectId ?? null,
  }
  return JSON.stringify(body)
}

/** Content hash for cite / integrity (KD pack law). */
export function computePackContentHash(
  pack: Omit<EvidencePack, 'contentHash' | 'claimCount' | 'claimTypes' | 'sources'>,
): string {
  return sha256Hex(canonicalizePackBody(pack))
}

/**
 * Build a versioned EvidencePack.
 * Prefer `panels` + extractOptions so claims come from extractClaimsFromCorePanels.
 * Always enforces ≤200 claims unless maxClaims is explicitly null.
 */
export function buildEvidencePack(input: BuildEvidencePackInput): EvidencePack {
  const maxClaims = input.maxClaims === undefined ? MAX_PACK_CLAIMS : input.maxClaims
  const createdAt = input.createdAt ?? nowIso()
  const id = input.id ?? newPackId()
  const version = input.version ?? 1
  const title = (input.title.trim() || 'Evidence pack').slice(0, 200)

  let claims: EvidenceClaim[]
  if (input.panels) {
    const extractOpts: ExtractAllOptions = {
      retrievedAt: input.extractOptions?.retrievedAt ?? createdAt,
      subjectCandidateId: input.extractOptions?.subjectCandidateId,
      moleculeName: input.extractOptions?.moleculeName,
      limit: input.extractOptions?.limit,
      epistemicStatus: input.extractOptions?.epistemicStatus,
      totalCap: maxClaims,
      preferFacetOrder: input.extractOptions?.preferFacetOrder ?? true,
      landscapeMode:
        input.landscapeMode === true || input.extractOptions?.landscapeMode === true,
    }
    claims = extractClaimsFromCorePanels(input.panels, extractOpts)
  } else {
    claims = capPackClaims(input.claims ?? [], maxClaims)
  }

  const candidates = [...(input.candidates ?? [])]
  const targets = [...(input.targets ?? [])]
  const rubric = input.rubric
  const preferencesSnapshot = input.preferencesSnapshot

  const draft: Omit<EvidencePack, 'contentHash' | 'claimCount' | 'claimTypes' | 'sources'> = {
    schemaVersion: EVIDENCE_PACK_SCHEMA_VERSION,
    id,
    version,
    title,
    createdAt,
    preferencesSnapshot,
    disease: input.disease ?? null,
    targets,
    candidates,
    claims,
    rubric,
    projectId: input.projectId,
  }

  const contentHash = computePackContentHash(draft)
  const claimTypes = countClaimsByType(claims)
  const sources = claimSourceNames(claims)

  return {
    ...draft,
    contentHash,
    claimCount: claims.length,
    claimTypes,
    sources,
  }
}

/** Pretty-print pack JSON for download. */
export function packToJson(pack: EvidencePack): string {
  return JSON.stringify(pack, null, 2)
}

function mdEscape(s: string): string {
  return s.replace(/\r\n/g, '\n')
}

/**
 * Human-readable Markdown export of an evidence pack.
 */
export function packToMarkdown(pack: EvidencePack): string {
  const lines: string[] = []
  lines.push(`# ${mdEscape(pack.title)}`)
  lines.push('')
  lines.push(`> Point-in-time evidence pack (schema v${pack.schemaVersion}, doc v${pack.version}).`)
  lines.push(`> Not clinical advice. Scores and claims are triage aids only.`)
  lines.push('')
  lines.push('| Field | Value |')
  lines.push('| --- | --- |')
  lines.push(`| Pack id | \`${pack.id}\` |`)
  lines.push(`| Content hash | \`${pack.contentHash}\` |`)
  lines.push(`| Created | ${pack.createdAt} |`)
  lines.push(`| Claims | ${pack.claimCount} (max ${MAX_PACK_CLAIMS}) |`)
  if (pack.projectId) lines.push(`| Project | \`${pack.projectId}\` |`)
  if (pack.disease?.name) {
    lines.push(
      `| Disease | ${mdEscape(pack.disease.name)} (\`${pack.disease.id}\` / ${pack.disease.idNamespace}) |`,
    )
  }
  if (pack.preferencesSnapshot) {
    const p = pack.preferencesSnapshot
    lines.push(
      `| Preferences | rubric=${p.rubricPreset}; AE=${p.aeAggressiveness}; harvest=${p.harvestTiming} |`,
    )
  }
  if (pack.rubric) {
    lines.push(
      `| Rubric | ${pack.rubric.preset} (missing=${pack.rubric.missingAxisPolicy}, AE=${pack.rubric.aeAggressiveness}) |`,
    )
  }
  lines.push('')

  if (pack.targets.length > 0) {
    lines.push('## Targets')
    lines.push('')
    for (const t of pack.targets) {
      lines.push(`- **${mdEscape(t.symbol)}** (\`${t.id}\`)${t.name ? ` — ${mdEscape(t.name)}` : ''}`)
    }
    lines.push('')
  }

  if (pack.candidates.length > 0) {
    lines.push('## Candidates')
    lines.push('')
    lines.push('| Name | candidateId | CID | ChEMBL | Board |')
    lines.push('| --- | --- | --- | --- | --- |')
    for (const c of pack.candidates) {
      lines.push(
        `| ${mdEscape(c.identity.name)} | \`${c.candidateId}\` | ${c.identity.pubchemCid ?? '—'} | ${c.identity.chemblId ?? '—'} | ${c.boardStatus ?? '—'} |`,
      )
    }
    lines.push('')
  }

  if (pack.sources.length > 0) {
    lines.push('## Evidence breadth (sources)')
    lines.push('')
    lines.push(pack.sources.map((s) => `- ${mdEscape(s)}`).join('\n'))
    lines.push('')
  }

  if (Object.keys(pack.claimTypes).length > 0) {
    lines.push('## Claim facets')
    lines.push('')
    for (const [type, n] of Object.entries(pack.claimTypes).sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`- **${type}**: ${n}`)
    }
    lines.push('')
  }

  lines.push('## Claims')
  lines.push('')
  if (pack.claims.length === 0) {
    lines.push('_No claims in this pack._')
    lines.push('')
  } else {
    pack.claims.forEach((c, i) => {
      lines.push(`### ${i + 1}. ${c.claimType} — \`${c.id}\``)
      lines.push('')
      lines.push(mdEscape(c.statement))
      lines.push('')
      lines.push(
        `- **Provenance:** ${mdEscape(c.provenance.source)}` +
          (c.provenance.sourceUrl ? ` ([link](${c.provenance.sourceUrl}))` : '') +
          ` · retrieved ${c.provenance.retrievedAt}`,
      )
      lines.push(`- **Epistemic:** ${c.epistemicStatus}`)
      if (c.subjectCandidateId) lines.push(`- **Subject:** \`${c.subjectCandidateId}\``)
      if (c.targetId) lines.push(`- **Target:** \`${c.targetId}\``)
      if (c.diseaseId) lines.push(`- **Disease:** \`${c.diseaseId}\``)
      lines.push('')
    })
  }

  lines.push('---')
  lines.push('')
  lines.push(
    `_Generated by BioIntel Explorer. Cite content hash \`${pack.contentHash.slice(0, 12)}…\` for this export._`,
  )
  lines.push('')

  return lines.join('\n')
}

/** Filename helpers for downloads. */
export function packExportFilename(
  pack: Pick<EvidencePack, 'title' | 'id' | 'createdAt'>,
  ext: 'json' | 'md',
): string {
  const slug = pack.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'evidence-pack'
  const day = pack.createdAt.slice(0, 10)
  return `${slug}-${day}.${ext}`
}

/**
 * Pull Core panel DTOs from a profile / category merged-data bag.
 * Keys match ProfilePageClient mergedData propKeys.
 */
export function corePanelsFromProfileData(
  data: Record<string, unknown> | null | undefined,
): CorePanelEvidenceInput {
  if (!data) return {}
  const clinicalTrials = asArray<ClinicalTrial>(data.clinicalTrials)
  return {
    chemblActivities: asArray(data.chemblActivities),
    chemblMechanisms: asArray(data.chemblMechanisms),
    adverseEvents: asArray(data.adverseEvents),
    clinicalTrials,
    diseaseAssociations: asArray(data.diseaseAssociations),
    landscape: {
      moleculeName: typeof data.moleculeName === 'string' ? data.moleculeName : undefined,
      clinicalTrials,
      researchOrgs: asArray(data.researchOrgs),
      researchOrgsLit: asArray(data.researchOrgsLit),
      euResearchOrgs: asArray(data.euResearchOrgs),
      usHospitals: asArray(data.usHospitals),
      usColleges: asArray(data.usColleges),
      nihGrants: asArray(data.nihGrants),
      literature: asArray(data.literature),
      pubmedArticles: asArray(data.pubmedArticles),
      openAlexWorks: asArray(data.openAlexWorks),
      biologicsLicensed: asArray(data.biologicsLicensed),
      purpleBookProducts: asArray(data.purpleBookProducts),
      purpleBookPatents: asArray(data.purpleBookPatents),
      emaBulkMedicines: asArray(data.emaBulkMedicines),
    },
  }
}

function asArray<T>(v: unknown): T[] | null {
  if (v == null) return null
  return Array.isArray(v) ? (v as T[]) : null
}

/** Lightweight type guard for downloaded / re-imported packs. */
export function isEvidencePack(value: unknown): value is EvidencePack {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.schemaVersion === EVIDENCE_PACK_SCHEMA_VERSION &&
    typeof v.id === 'string' &&
    typeof v.version === 'number' &&
    typeof v.title === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.contentHash === 'string' &&
    Array.isArray(v.claims) &&
    Array.isArray(v.candidates) &&
    Array.isArray(v.targets) &&
    typeof v.claimCount === 'number'
  )
}

/** Default rubric when building a pack without an explicit one. */
export function defaultPackRubric(
  preferencesSnapshot?: DiscoveryPreferencesSnapshot,
): ScoreRubric {
  return createDefaultScoreRubric(preferencesSnapshot?.rubricPreset ?? 'balanced', {
    aeAggressiveness: preferencesSnapshot?.aeAggressiveness ?? 'soft-flag',
  })
}
