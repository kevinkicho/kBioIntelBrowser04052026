/**
 * Discovery rank engine — gather + multi-axis cheap score + optional safety harvest.
 * Dual-schema RankResult (legacy + v2 DiscoveryResult).
 */

import { searchDiseases, resolveMoleculesFromNames, type DiseaseResult } from '../diseaseSearch'
import { getDiseaseById } from '../api/opentargets'
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
  applyResolvedIdentities,
  DEFAULT_IDENTITY_TOP_N,
  identityFallbackFromInputs,
  resolveIdentitiesBatch,
  type IdentityResolveInput,
} from './identityResolve'
import type { DiseaseEntity } from '../domain/entities'
import {
  gatherDiseaseGenes,
  gatherTargetMolecules,
  gatherTrialDrugs,
  gatherChemblIndications,
  gatherOpenTargetsKnownDrugs,
  gatherChemblByTarget,
} from './sources'
import type { CandidateMolecule, DiseaseGene, RankResult } from './types'
import { withSourceStatus } from './sourceStatus'

/** Documented intentional decontamination (PR3a). */
export const OT_KNOWN_DRUGS_DECONTAMINATION_WARNING =
  'Open Targets knownDrugs path excluded: getDrugsForDisease returns linked target/protein names, not drugs. Restored in PR3b via knownDrugs GraphQL.'

const MAX_MOLECULE_NAMES = 50
const MAX_CID_RESOLVE = 50

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

export interface RankEngineOptions {
  limit?: number
  rubric?: ScoreRubric
  preferencesSnapshot?: DiscoveryPreferencesSnapshot
  /** Hard pin: skip multi-hit confirmation and rank this disease only. */
  diseaseId?: string
  /** Gene symbols pinned via deep-link targets=. */
  targets?: string[]
  /** If true, harvest safety for top-K after cheap score. */
  runSafetyHarvest?: boolean
  /** If true, harvest novelty for top-K after cheap score. */
  runNoveltyHarvest?: boolean
  harvestK?: number
}

/** Alias for facade re-exports (PR6b name). */
export type RankCandidatesOptions = RankEngineOptions

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

function findPinnedDisease(hits: DiseaseResult[], diseaseId: string): DiseaseResult | undefined {
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
function mergePinnedGenes(genes: DiseaseGene[], pins: string[]): DiseaseGene[] {
  if (pins.length === 0) return genes
  const bySym = new Map(genes.map((g) => [g.symbol.toUpperCase(), g]))
  const out = [...genes]
  for (const symbol of pins) {
    const s = symbol.trim().toUpperCase()
    if (!s) continue
    const existing = bySym.get(s)
    if (existing) {
      // Real disease association already present — keep DB score/source; pin still biases via panel
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
  maybeOptions?: RankEngineOptions,
): Promise<RankResult> {
  const options: RankEngineOptions =
    typeof limitOrOptions === 'number'
      ? { ...(maybeOptions ?? {}), limit: limitOrOptions }
      : limitOrOptions ?? {}
  const limit = Math.min(Math.max(options.limit ?? 15, 1), 25)
  const rubric = options.rubric ?? createDefaultScoreRubric('balanced')
  const runSafetyHarvest = options.runSafetyHarvest === true
  const runNoveltyHarvest = options.runNoveltyHarvest === true
  const harvestK = Math.min(options.harvestK ?? HARVEST_K_DEFAULT, limit)
  const pinnedId = options.diseaseId?.trim() || undefined
  const pinnedTargets = (options.targets ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 10)

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
    identity?: number
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

  if (diseaseLookup.value.length === 0 && !pinnedId) {
    warnings.push('No disease matches for query.')
    return emptyRankResult(query, {
      warnings,
      sourceStatuses,
      generatedAt,
      rubric,
      preferencesSnapshot: options.preferencesSnapshot,
    })
  }

  let primaryDisease: DiseaseResult
  if (pinnedId) {
    let pinned = findPinnedDisease(diseaseLookup.value, pinnedId)
    // Name search may return a different ontology id for the same disease
    // (e.g. typeahead MONDO_* vs Open Targets EFO_*). Resolve the pin by id.
    if (!pinned) {
      const byId = await getDiseaseById(pinnedId)
      if (byId) {
        pinned = {
          id: byId.id,
          name: byId.name,
          description: byId.description,
          therapeuticAreas: byId.therapeuticAreas,
          source: 'Open Targets',
        }
        warnings.push(
          `diseaseId pin ${pinnedId} resolved via Open Targets registry (not present in name-search hits).`,
        )
      }
    }
    // Last resort: if name search found a single high-confidence match for q, use it
    // only when the pin id is a known synonym style of the hit (already normalized miss).
    if (!pinned && diseaseLookup.value.length === 1) {
      const only = diseaseLookup.value[0]!
      const qNorm = query.trim().toLowerCase()
      if (only.name.toLowerCase() === qNorm || only.name.toLowerCase().includes(qNorm)) {
        pinned = only
        warnings.push(
          `diseaseId pin ${pinnedId} not found; using sole name match "${only.name}" (${only.id}).`,
        )
      }
    }
    if (!pinned) throw new UnknownDiseaseIdError(pinnedId)
    primaryDisease = pinned
  } else if (diseaseLookup.value.length > 1) {
    // Early multi-hit confirm — no silent results[0]
    const diseaseCandidates = diseaseLookup.value.map(diseaseResultToEntity)
    const warning = `Multiple disease matches (${diseaseLookup.value.length}); confirm which disease to rank.`
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
    const v2 = mapRankResultToDiscoveryResult(base, { generatedAt, rubric })
    v2.disease = null
    v2.diseaseCandidates = diseaseCandidates
    v2.needsDiseaseConfirmation = true
    v2.sourceStatuses = sourceStatuses
    v2.warnings = [warning]
    v2.timingMs = { total: Date.now() - timingStart, disease: timing.disease }
    if (options.preferencesSnapshot) v2.preferencesSnapshot = options.preferencesSnapshot
    base.v2 = v2
    return base
  } else {
    primaryDisease = diseaseLookup.value[0]
  }

  const diseaseId = primaryDisease.id ?? null
  const diseaseName = primaryDisease.name
  const therapeuticAreas = primaryDisease.therapeuticAreas ?? []

  const targetsStart = Date.now()
  const geneGather = await gatherDiseaseGenes(diseaseId, diseaseName)
  sourceStatuses.push(...geneGather.statuses)
  const genes: DiseaseGene[] = mergePinnedGenes(geneGather.genes, pinnedTargets)
  timing.targets = Date.now() - targetsStart

  const gatherStart = Date.now()
  const [targetGather, trialGather, knownDrugsGather, chemblByTargetGather] = await Promise.all([
    gatherTargetMolecules(genes),
    gatherTrialDrugs(diseaseName),
    gatherOpenTargetsKnownDrugs(diseaseId),
    gatherChemblByTarget(genes),
  ])

  sourceStatuses.push(...targetGather.statuses)
  sourceStatuses.push(trialGather.status)
  sourceStatuses.push(knownDrugsGather.status)
  sourceStatuses.push(chemblByTargetGather.status)

  const moleculesFromTargets = targetGather.molecules
  const moleculesFromTrials = trialGather.drugCounts
  const knownDrugNames = knownDrugsGather.names
  const chemblByTargetNames = chemblByTargetGather.names

  const { names: moleculeNamesFromDisease } = moleculeNamesFromDiseaseResult(primaryDisease)

  const allMoleculeNames = new Set<string>()
  for (const m of moleculesFromTargets) allMoleculeNames.add(m.name)
  moleculesFromTrials.forEach((_, name) => allMoleculeNames.add(name))
  for (const name of moleculeNamesFromDisease) allMoleculeNames.add(name)
  for (const name of knownDrugNames) allMoleculeNames.add(name)
  for (const name of chemblByTargetNames) allMoleculeNames.add(name)

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
    if (knownDrugNames.some((n) => n.toLowerCase() === lowerName)) {
      sources.push('Open Targets knownDrugs')
    }
    if (chemblByTargetNames.some((n) => n.toLowerCase() === lowerName) || indications.length > 0) {
      sources.push('ChEMBL')
    }

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

  // Stage 3 — batch identity (InChIKey + IdentityTrust) for top-N shortlist
  const identityInputs: IdentityResolveInput[] = sorted.map((c) => ({
    name: c.name,
    cid: c.cid,
  }))
  const identityLookup = await withSourceStatus(
    'PubChem (identity/InChIKey)',
    () =>
      resolveIdentitiesBatch(identityInputs, {
        topN: Math.min(DEFAULT_IDENTITY_TOP_N, sorted.length),
      }),
    {
      fallback: identityFallbackFromInputs(identityInputs),
      hasData: (v) => v.highTrustCount > 0 || v.fetchedCount > 0,
    },
  )
  sourceStatuses.push(identityLookup.status)

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

  // Prefer multi-axis ScoreVectors, then attach resolved identity
  for (const mc of v2.candidates) {
    const s = scoreByName.get(mc.identity.name.toLowerCase())
    if (s) mc.scores = s
  }
  v2.candidates = applyResolvedIdentities(v2.candidates, identityLookup.value.resolved)

  const warningSet = new Set([...v2.warnings, ...warnings])
  v2.warnings = Array.from(warningSet)
  timing.total = Date.now() - timingStart
  v2.timingMs = {
    ...timing,
    identity: identityLookup.status.duration_ms ?? identityLookup.value.durationMs,
  }

  v2.needsDiseaseConfirmation = false
  if (v2.disease) {
    v2.diseaseCandidates = [v2.disease]
  }

  rank.v2 = v2
  return rank
}
