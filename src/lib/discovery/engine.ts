/**
 * Discovery rank engine — gather + legacy score + dual-schema RankResult.
 * Ranking formulas intentionally unchanged (multi-axis = PR4).
 * ChEMBL-by-target / OT knownDrugs = PR3b.
 * PR6b: multi-hit disease confirmation + diseaseId hard pin.
 */

import { searchDiseases, resolveMoleculesFromNames, type DiseaseResult } from '../diseaseSearch'
import type { SourceFetchStatus } from '../dataStatus'
import type { DiseaseEntity } from '../domain/entities'
import { mapRankResultToDiscoveryResult } from '../domain/mappers'
import { scoreLegacyCandidate, sortCandidates } from './legacyScore'
import {
  gatherDiseaseGenes,
  gatherTargetMolecules,
  gatherTrialDrugs,
  gatherChemblIndications,
} from './sources'
import type { CandidateMolecule, DiseaseGene, RankResult } from './types'
import { withSourceStatus } from './sourceStatus'

/** Documented intentional decontamination (PR3a). */
export const OT_KNOWN_DRUGS_DECONTAMINATION_WARNING =
  'Open Targets knownDrugs path excluded: getDrugsForDisease returns linked target/protein names, not drugs. Restored in PR3b via knownDrugs GraphQL.'

const MAX_MOLECULE_NAMES = 50
const MAX_CID_RESOLVE = 50

/** Thrown when a hard diseaseId pin is not found among search hits (no fuzzy substitute). */
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

export interface RankCandidatesOptions {
  /** Hard pin: skip multi-hit confirmation and rank this disease only. */
  diseaseId?: string
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

/** Map a disease search hit to domain DiseaseEntity for disambiguation UI / v2. */
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

function emptyRankResult(
  query: string,
  opts?: {
    diseaseName?: string
    warnings?: string[]
    sourceStatuses?: SourceFetchStatus[]
    generatedAt?: string
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
  base.v2 = mapRankResultToDiscoveryResult(base, { generatedAt })
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

/**
 * Multi-hit confirm payload: no silent results[0]; empty candidates until user pins diseaseId.
 */
function multiHitConfirmResult(
  query: string,
  hits: DiseaseResult[],
  sourceStatuses: SourceFetchStatus[],
  generatedAt: string,
  timingStart: number,
): RankResult {
  const diseaseCandidates = hits.map(diseaseResultToEntity)
  const warning = `Multiple disease matches (${hits.length}); confirm which disease to rank.`
  const base: RankResult = {
    query,
    diseaseId: null,
    diseaseName: query,
    therapeuticAreas: [],
    genes: [],
    candidates: [],
    sourceStatuses,
    generatedAt,
    warnings: [warning],
  }
  const v2 = mapRankResultToDiscoveryResult(base, { generatedAt })
  v2.disease = null
  v2.diseaseCandidates = diseaseCandidates
  v2.needsDiseaseConfirmation = true
  v2.sourceStatuses = sourceStatuses
  v2.warnings = [warning]
  v2.timingMs = { total: Date.now() - timingStart, disease: Date.now() - timingStart }
  base.v2 = v2
  return base
}

function findPinnedDisease(hits: DiseaseResult[], diseaseId: string): DiseaseResult | undefined {
  const pin = diseaseId.trim()
  if (!pin) return undefined
  const lower = pin.toLowerCase()
  return hits.find((d) => d.id && d.id.toLowerCase() === lower)
}

/**
 * Rank candidate molecules for a disease query.
 * Returns legacy RankResult fields + additive sourceStatuses/generatedAt/warnings/v2.
 *
 * PR6b:
 * - Multiple hits without `options.diseaseId` → early return, needsDiseaseConfirmation
 * - `options.diseaseId` hard pin → exact id match only; unknown id throws UnknownDiseaseIdError
 */
export async function rankCandidatesForDisease(
  query: string,
  limit: number = 15,
  options?: RankCandidatesOptions,
): Promise<RankResult> {
  const generatedAt = new Date().toISOString()
  const sourceStatuses: SourceFetchStatus[] = []
  const warnings: string[] = []
  const timingStart = Date.now()
  const pinnedId = options?.diseaseId?.trim() || undefined

  const diseaseLookup = await withSourceStatus(
    'Disease search',
    () => searchDiseases(query, 5),
    {
      fallback: [] as DiseaseResult[],
      hasData: (v) => v.length > 0,
    },
  )
  sourceStatuses.push(diseaseLookup.status)

  if (diseaseLookup.value.length === 0) {
    if (pinnedId) {
      throw new UnknownDiseaseIdError(pinnedId)
    }
    warnings.push('No disease matches for query.')
    return emptyRankResult(query, { warnings, sourceStatuses, generatedAt })
  }

  let primaryDisease: DiseaseResult

  if (pinnedId) {
    const pinned = findPinnedDisease(diseaseLookup.value, pinnedId)
    if (!pinned) {
      throw new UnknownDiseaseIdError(pinnedId)
    }
    primaryDisease = pinned
  } else if (diseaseLookup.value.length > 1) {
    // Never silent results[0] when multi-hit without hard pin
    return multiHitConfirmResult(
      query,
      diseaseLookup.value,
      sourceStatuses,
      generatedAt,
      timingStart,
    )
  } else {
    primaryDisease = diseaseLookup.value[0]
  }

  const diseaseId = primaryDisease.id ?? null
  const diseaseName = primaryDisease.name
  const therapeuticAreas = primaryDisease.therapeuticAreas ?? []

  // Single OT + DisGeNET gene walk for scoring and DGIdb (no double-fetch).
  const geneGather = await gatherDiseaseGenes(diseaseId, diseaseName)
  sourceStatuses.push(...geneGather.statuses)
  const genes: DiseaseGene[] = geneGather.genes

  const [targetGather, trialGather] = await Promise.all([
    gatherTargetMolecules(genes),
    gatherTrialDrugs(diseaseName),
  ])

  sourceStatuses.push(...targetGather.statuses)
  sourceStatuses.push(trialGather.status)

  const moleculesFromTargets = targetGather.molecules
  const moleculesFromTrials = trialGather.drugCounts

  const { names: moleculeNamesFromDisease, skippedOtTargetNames } =
    moleculeNamesFromDiseaseResult(primaryDisease)

  if (skippedOtTargetNames) {
    warnings.push(OT_KNOWN_DRUGS_DECONTAMINATION_WARNING)
    sourceStatuses.push({
      source: 'Open Targets (knownDrugs)',
      status: 'disabled',
      has_data: false,
      error: 'Decontaminated: getDrugsForDisease returns target names (PR3b)',
    })
  }

  const allMoleculeNames = new Set<string>()
  for (const m of moleculesFromTargets) allMoleculeNames.add(m.name)
  moleculesFromTrials.forEach((_, name) => allMoleculeNames.add(name))
  for (const name of moleculeNamesFromDisease) allMoleculeNames.add(name)

  const moleculeArray = Array.from(allMoleculeNames).slice(0, MAX_MOLECULE_NAMES)
  const topTargetCount = Math.max(genes.length, 1)
  const maxTrialCount = Math.max(...Array.from(moleculesFromTrials.values()), 1)

  const cidLookup = await withSourceStatus(
    'PubChem (name→CID)',
    () => resolveMoleculesFromNames(moleculeArray.slice(0, MAX_CID_RESOLVE)),
    {
      fallback: [] as { name: string; cid: number | null }[],
      hasData: (v) => v.some((r) => r.cid != null),
    },
  )
  sourceStatuses.push(cidLookup.status)

  const cidMap = new Map<string, number | null>()
  for (const r of cidLookup.value) cidMap.set(r.name.toLowerCase(), r.cid)

  const { indicationMap, status: indicationStatus } =
    await gatherChemblIndications(moleculeArray)
  sourceStatuses.push(indicationStatus)

  const candidates: CandidateMolecule[] = []

  for (const name of moleculeArray) {
    const lowerName = name.toLowerCase()
    const cid = cidMap.get(lowerName) ?? null
    const targetMol = moleculesFromTargets.find((m) => m.name.toLowerCase() === lowerName)
    const trialCount =
      moleculesFromTrials.get(name) ?? moleculesFromTrials.get(lowerName) ?? 0
    const indications = indicationMap.get(name) ?? []

    const sources: string[] = []
    if (targetMol) sources.push('DGIdb')
    if (trialCount > 0) sources.push('ClinicalTrials')
    if (moleculeNamesFromDisease.some((n) => n.toLowerCase() === lowerName)) {
      sources.push(primaryDisease.source)
    }
    if (indications.length > 0) sources.push('ChEMBL')

    candidates.push(
      scoreLegacyCandidate({
        name,
        cid,
        diseaseName,
        targetMol,
        trialCount,
        maxTrialCount,
        genes,
        topTargetCount,
        indications,
        sources,
      }),
    )
  }

  const sorted = sortCandidates(candidates).slice(0, limit)

  const rank: RankResult = {
    query,
    diseaseId,
    diseaseName,
    therapeuticAreas,
    genes,
    candidates: sorted,
    sourceStatuses,
    generatedAt,
    warnings,
  }

  const v2 = mapRankResultToDiscoveryResult(rank, { generatedAt })
  v2.sourceStatuses = sourceStatuses
  const warningSet = new Set([...v2.warnings, ...warnings])
  v2.warnings = Array.from(warningSet)
  v2.timingMs = {
    total: Date.now() - timingStart,
  }
  // Confirmed / single / pinned — no multi-hit confirmation needed
  v2.needsDiseaseConfirmation = false
  if (v2.disease) {
    v2.diseaseCandidates = [v2.disease]
  }

  rank.v2 = v2
  return rank
}
