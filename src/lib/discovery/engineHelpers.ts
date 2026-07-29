/**
 * Pure helpers for Discover rank engine (disease pin, empty results, cheap score).
 * Score/axis math lives in scoreAxes; rank orchestration stays in engine.ts.
 * Product law: no LLM in of-record rank path.
 */

import type { DiseaseResult } from '../diseaseSearch'
import type { SourceFetchStatus } from '../dataStatus'
import { mapRankResultToDiscoveryResult } from '../domain/mappers'
import type { ScoreRubric, ScoreVector } from '../domain/score'
import { assessIdentityTrust } from '../domain/identity'
import type { DiscoveryPreferencesSnapshot } from './preferences'
import { buildScoreVector } from './scoreAxes'
import type { DiseaseEntity } from '../domain/entities'
import type { CandidateMolecule, DiseaseGene, RankResult } from './types'

/** Documented intentional decontamination (PR3a). */
export const OT_KNOWN_DRUGS_DECONTAMINATION_WARNING =
  'Open Targets knownDrugs path excluded: getDrugsForDisease returns linked target/protein names, not drugs. Restored in PR3b via knownDrugs GraphQL.'

/** Thrown when a hard diseaseId pin is not found among search hits. */
export class UnknownDiseaseIdError extends Error {
  readonly diseaseId: string
  constructor(diseaseId: string) {
    super(
      `Unknown diseaseId "${diseaseId}"; no fuzzy substitute applied. Provide a valid registry id from disease search.`,
    )
    this.name = 'UnknownDiseaseIdError'
    this.diseaseId = diseaseId
  }
}

export function diseaseResultToEntity(d: DiseaseResult): DiseaseEntity {
  const id = d.id || d.name
  return {
    id,
    idNamespace: d.id ? 'ot' : 'name',
    name: d.name,
    synonyms: [],
    description: d.description,
    therapeuticAreas: d.therapeuticAreas ?? [],
    xrefs: d.id ? [{ system: d.source, id: d.id }] : [],
    identityTrust: d.id ? 'medium' : 'unresolved',
  }
}

/** Normalize registry disease ids for pin matching (MONDO:x ↔ MONDO_x, strip OBO URLs). */
export function normalizeDiseaseRegistryId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/purl\.obolibrary\.org\/obo\//i, '')
    .replace(/^http:\/\/www\.ebi\.ac\.uk\/efo\//i, '')
    .replace(/:/g, '_')
}

export function findPinnedDisease(
  hits: DiseaseResult[],
  diseaseId: string,
): DiseaseResult | undefined {
  const pin = normalizeDiseaseRegistryId(diseaseId)
  if (!pin) return undefined
  return hits.find((d) => d.id && normalizeDiseaseRegistryId(d.id) === pin)
}

/**
 * Inject user-pinned symbols into the gene list used for drug gather / scoring.
 * These are NOT disease–gene associations from public DBs — source is `pinned-target`
 * so the GeneTable can hide them (pins already have TargetPinPanel).
 * Score 1.0 only affects gather preference + geneAssociation axis when a drug hits the pin.
 */
export function mergePinnedGenes(genes: DiseaseGene[], pins: string[]): DiseaseGene[] {
  if (pins.length === 0) return genes
  const bySym = new Map(genes.map((g) => [g.symbol.toUpperCase(), g]))
  const out = [...genes]
  for (const symbol of pins) {
    const s = symbol.trim().toUpperCase()
    if (!s) continue
    const existing = bySym.get(s)
    if (existing) {
      continue
    }
    bySym.set(s, { symbol: s, score: 1, source: 'pinned-target' })
    out.unshift({ symbol: s, score: 1, source: 'pinned-target' })
  }
  return out
}

/**
 * Safe disease-side molecule names for candidate gather.
 * Open Targets enrichment historically called getDrugsForDisease, which returns
 * **target names** (not molecules). Those must never enter the candidate set.
 */
export function moleculeNamesFromDiseaseResult(disease: DiseaseResult): {
  names: string[]
  skippedOtTargetNames: boolean
} {
  if (disease.source === 'Open Targets') {
    return { names: [], skippedOtTargetNames: true }
  }
  const names = (disease.molecules ?? []).map((m) => m.name).filter(Boolean)
  return { names, skippedOtTargetNames: false }
}

export function emptyRankResult(
  query: string,
  opts?: {
    diseaseName?: string
    warnings?: string[]
    sourceStatuses?: SourceFetchStatus[]
    generatedAt?: string
    rubric?: ScoreRubric
    preferencesSnapshot?: DiscoveryPreferencesSnapshot
  },
): RankResult {
  const generatedAt = opts?.generatedAt ?? new Date().toISOString()
  const base: RankResult = {
    query,
    diseaseId: null,
    diseaseName: opts?.diseaseName ?? query,
    therapeuticAreas: [],
    genes: [],
    candidates: [],
    sourceStatuses: opts?.sourceStatuses ?? [],
    generatedAt,
    warnings: opts?.warnings ?? [],
  }
  base.v2 = mapRankResultToDiscoveryResult(base, {
    generatedAt,
    rubric: opts?.rubric,
  })
  if (opts?.preferencesSnapshot) {
    base.v2.preferencesSnapshot = opts.preferencesSnapshot
  }
  if (base.sourceStatuses) {
    base.v2.sourceStatuses = base.sourceStatuses
  }
  if (base.warnings?.length) {
    base.v2.warnings = [
      ...base.v2.warnings,
      ...base.warnings.filter((w) => !base.v2!.warnings.includes(w)),
    ]
  }
  return base
}

export function cheapScoreVector(
  c: CandidateMolecule,
  rubric: ScoreRubric,
  extras?: { chemblActivityTerm?: number | null; identityTrust?: number | null },
): ScoreVector {
  const trust =
    extras?.identityTrust != null
      ? { axisValue: extras.identityTrust }
      : assessIdentityTrust({ cid: c.cid, name: c.name })
  return buildScoreVector({
    rubric,
    scorePhase: 'cheap',
    cheap: {
      geneAssociationScore: c.geneAssociationScore,
      sharedTargetRatio: c.sharedTargetRatio,
      maxPhase: c.clinicalPhaseRaw,
      trialNorm: c.trialCountNorm,
      identityTrust: trust.axisValue,
      chemblActivityTerm: extras?.chemblActivityTerm ?? null,
      sources: c.sources,
    },
  })
}
