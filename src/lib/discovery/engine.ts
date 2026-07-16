/**
 * Discovery rank engine — gather + multi-axis cheap score + optional safety harvest.
 * Dual-schema RankResult (legacy + v2 DiscoveryResult).
 */

import { searchDiseases, resolveMoleculesFromNames, type DiseaseResult } from '../diseaseSearch'
import type { SourceFetchStatus } from '../dataStatus'
import { mapRankResultToDiscoveryResult } from '../domain/mappers'
import {
  createDefaultScoreRubric,
  type ScoreRubric,
  type ScoreVector,
} from '../domain/score'
import { assessIdentityTrust } from '../domain/identity'
import type { DiscoveryPreferencesSnapshot } from './preferences'
import { scoreLegacyCandidate, sortCandidates } from './legacyScore'
import { buildScoreVector } from './scoreAxes'
import {
  harvestCandidateAxes,
  HARVEST_K_DEFAULT,
} from './harvest'
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

export interface RankEngineOptions {
  limit?: number
  rubric?: ScoreRubric
  preferencesSnapshot?: DiscoveryPreferencesSnapshot
  /** If true, harvest safety for top-K after cheap score. */
  runSafetyHarvest?: boolean
  /** If true, harvest novelty for top-K after cheap score. */
  runNoveltyHarvest?: boolean
  harvestK?: number
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

function emptyRankResult(
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

function cheapScoreVector(
  c: CandidateMolecule,
  rubric: ScoreRubric,
): ScoreVector {
  const trust = assessIdentityTrust({ cid: c.cid, name: c.name })
  return buildScoreVector({
    rubric,
    scorePhase: 'cheap',
    cheap: {
      geneAssociationScore: c.geneAssociationScore,
      sharedTargetRatio: c.sharedTargetRatio,
      maxPhase: c.clinicalPhaseRaw,
      trialNorm: c.trialCountNorm,
      identityTrust: trust.axisValue,
      sources: c.sources,
    },
  })
}

/**
 * Rank candidate molecules for a disease query.
 * Returns legacy RankResult fields + additive sourceStatuses/generatedAt/warnings/v2.
 */
export async function rankCandidatesForDisease(
  query: string,
  limitOrOptions: number | RankEngineOptions = 15,
): Promise<RankResult> {
  const options: RankEngineOptions =
    typeof limitOrOptions === 'number' ? { limit: limitOrOptions } : limitOrOptions ?? {}
  const limit = Math.min(Math.max(options.limit ?? 15, 1), 25)
  const rubric = options.rubric ?? createDefaultScoreRubric('balanced')
  const runSafetyHarvest = options.runSafetyHarvest === true
  const runNoveltyHarvest = options.runNoveltyHarvest === true
  const harvestK = Math.min(options.harvestK ?? HARVEST_K_DEFAULT, limit)

  const generatedAt = new Date().toISOString()
  const sourceStatuses: SourceFetchStatus[] = []
  const warnings: string[] = []
  const timingStart = Date.now()
  const timing: {
    disease?: number
    targets?: number
    gather?: number
    cheapScore?: number
    safetyHarvest?: number
    total?: number
  } = {}

  const diseaseStart = Date.now()
  const diseaseLookup = await withSourceStatus(
    'Disease search',
    () => searchDiseases(query, 5),
    {
      fallback: [] as DiseaseResult[],
      hasData: (v) => v.length > 0,
    },
  )
  sourceStatuses.push(diseaseLookup.status)
  timing.disease = Date.now() - diseaseStart

  if (diseaseLookup.value.length === 0) {
    warnings.push('No disease matches for query.')
    return emptyRankResult(query, {
      warnings,
      sourceStatuses,
      generatedAt,
      rubric,
      preferencesSnapshot: options.preferencesSnapshot,
    })
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

  const targetsStart = Date.now()
  const geneGather = await gatherDiseaseGenes(diseaseId, diseaseName)
  sourceStatuses.push(...geneGather.statuses)
  const genes: DiseaseGene[] = geneGather.genes
  timing.targets = Date.now() - targetsStart

  const gatherStart = Date.now()
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
  timing.gather = Date.now() - gatherStart

  const cheapStart = Date.now()
  const candidates: CandidateMolecule[] = []
  /** name → multi-axis ScoreVector (cheap, then optionally full) */
  const scoreByName = new Map<string, ScoreVector>()

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

    const legacy = scoreLegacyCandidate({
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
    })

    const multi = cheapScoreVector(legacy, rubric)
    scoreByName.set(lowerName, multi)

    candidates.push({
      ...legacy,
      compositeScore: multi.composite,
    })
  }

  let sorted = sortCandidates(candidates).slice(0, limit)
  timing.cheapScore = Date.now() - cheapStart

  let scorePhase: 'cheap' | 'full' = 'cheap'

  if ((runSafetyHarvest || runNoveltyHarvest) && sorted.length > 0) {
    const harvestStart = Date.now()
    const top = sorted.slice(0, harvestK)
    const harvest = await harvestCandidateAxes(
      top.map((c) => ({
        name: c.name,
        scores: scoreByName.get(c.name.toLowerCase()) ?? cheapScoreVector(c, rubric),
        phaseNorm: c.clinicalPhase,
        clinicalStage:
          scoreByName.get(c.name.toLowerCase())?.axes.clinicalStage ?? c.clinicalPhase,
      })),
      {
        runSafety: runSafetyHarvest,
        runNovelty: runNoveltyHarvest,
        rubric,
      },
    )
    sourceStatuses.push(...harvest.sourceStatuses)
    warnings.push(...harvest.warnings)
    timing.safetyHarvest = Date.now() - harvestStart
    scorePhase = 'full'

    for (const h of harvest.candidates) {
      scoreByName.set(h.name.toLowerCase(), h.scores)
    }

    sorted = sorted.map((c) => {
      const s = scoreByName.get(c.name.toLowerCase())
      if (!s) return c
      return { ...c, compositeScore: s.composite }
    })
    sorted = sortCandidates(sorted)
  }

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

  const v2 = mapRankResultToDiscoveryResult(rank, { generatedAt, rubric })
  v2.sourceStatuses = sourceStatuses
  v2.scorePhase = scorePhase
  if (options.preferencesSnapshot) {
    v2.preferencesSnapshot = options.preferencesSnapshot
  }

  // Prefer multi-axis ScoreVectors (with harvest when present) over mapper-only cheap rebuild
  for (const mc of v2.candidates) {
    const s = scoreByName.get(mc.identity.name.toLowerCase())
    if (s) mc.scores = s
  }

  const warningSet = new Set([...v2.warnings, ...warnings])
  v2.warnings = Array.from(warningSet)
  timing.total = Date.now() - timingStart
  v2.timingMs = timing

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
