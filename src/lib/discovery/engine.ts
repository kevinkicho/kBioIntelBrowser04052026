/**
 * Discovery rank engine — gather + legacy score + dual-schema RankResult.
 * Ranking formulas intentionally unchanged (multi-axis = PR4).
 * ChEMBL-by-target / OT knownDrugs = PR3b.
 */

import { searchDiseases, resolveMoleculesFromNames, type DiseaseResult } from '../diseaseSearch'
import type { SourceFetchStatus } from '../dataStatus'
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
    base.v2.warnings = [...base.v2.warnings, ...base.warnings.filter((w) => !base.v2!.warnings.includes(w))]
  }
  return base
}

/**
 * Rank candidate molecules for a disease query.
 * Returns legacy RankResult fields + additive sourceStatuses/generatedAt/warnings/v2.
 */
export async function rankCandidatesForDisease(
  query: string,
  limit: number = 15,
): Promise<RankResult> {
  const generatedAt = new Date().toISOString()
  const sourceStatuses: SourceFetchStatus[] = []
  const warnings: string[] = []
  const timingStart = Date.now()

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
    warnings.push('No disease matches for query.')
    return emptyRankResult(query, { warnings, sourceStatuses, generatedAt })
  }

  const primaryDisease = diseaseLookup.value[0]
  const diseaseId = primaryDisease.id ?? null
  const diseaseName = primaryDisease.name
  const therapeuticAreas = primaryDisease.therapeuticAreas ?? []

  if (diseaseLookup.value.length > 1) {
    warnings.push(
      `Multiple disease matches (${diseaseLookup.value.length}); using first hit "${diseaseName}" without confirmation (PR6b will add disambiguation).`,
    )
  }

  const [geneGather, targetGather, trialGather] = await Promise.all([
    gatherDiseaseGenes(diseaseId, diseaseName),
    gatherTargetMolecules(diseaseId, diseaseName),
    gatherTrialDrugs(diseaseName),
  ])

  sourceStatuses.push(...geneGather.statuses)
  sourceStatuses.push(...targetGather.statuses)
  sourceStatuses.push(trialGather.status)

  const genes: DiseaseGene[] = geneGather.genes
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
  // Merge engine warnings with mapper warnings (dedupe)
  const warningSet = new Set([...v2.warnings, ...warnings])
  v2.warnings = Array.from(warningSet)
  v2.timingMs = {
    total: Date.now() - timingStart,
  }
  // Multi-hit flag for future PR6b clients reading v2
  if (diseaseLookup.value.length > 1) {
    v2.needsDiseaseConfirmation = true
    v2.diseaseCandidates = diseaseLookup.value.map((d) => ({
      id: d.id || d.name,
      idNamespace: d.id ? ('ot' as const) : ('name' as const),
      name: d.name,
      synonyms: [],
      description: d.description,
      therapeuticAreas: d.therapeuticAreas ?? [],
      xrefs: d.id ? [{ system: d.source, id: d.id }] : [],
      identityTrust: d.id ? ('medium' as const) : ('unresolved' as const),
    }))
  }

  rank.v2 = v2
  return rank
}
