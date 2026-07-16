/**
 * Discovery rank engine — gather + legacy score + dual-schema RankResult.
 * Ranking formulas intentionally unchanged (multi-axis = PR4).
 * PR3b: OT knownDrugs (drugAndClinicalCandidates) + ChEMBL-by-target (5×15).
 */

import { searchDiseases, resolveMoleculesFromNames, type DiseaseResult } from '../diseaseSearch'
import type { SourceFetchStatus } from '../dataStatus'
import { mapRankResultToDiscoveryResult } from '../domain/mappers'
import {
  applyResolvedIdentities,
  DEFAULT_IDENTITY_TOP_N,
  identityFallbackFromInputs,
  resolveIdentitiesBatch,
  type IdentityResolveInput,
} from './identityResolve'
import { scoreLegacyCandidate, sortCandidates } from './legacyScore'
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

/**
 * Historical PR3a message (no longer emitted by the engine after PR3b restore).
 * Kept exported for any external string matchers / golden fixtures.
 */
export const OT_KNOWN_DRUGS_DECONTAMINATION_WARNING =
  'Open Targets knownDrugs path excluded: getDrugsForDisease returns linked target/protein names, not drugs. Restored in PR3b via knownDrugs GraphQL.'

const MAX_MOLECULE_NAMES = 50
const MAX_CID_RESOLVE = 50

/**
 * Safe disease-side molecule names for candidate gather.
 * Open Targets disease.molecules are still skipped here: rank gathers known drugs
 * via {@link gatherOpenTargetsKnownDrugs} (single source of truth, no double-count).
 * Contaminated target-name payloads from older clients are also ignored.
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

  // Single OT + DisGeNET gene walk for scoring and DGIdb / ChEMBL-by-target.
  const geneGather = await gatherDiseaseGenes(diseaseId, diseaseName)
  sourceStatuses.push(...geneGather.statuses)
  const genes: DiseaseGene[] = geneGather.genes

  const [targetGather, trialGather, knownDrugsGather, chemblByTargetGather] =
    await Promise.all([
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

  // Non-OT disease.molecules only (OT drugs come from knownDrugsGather).
  const { names: moleculeNamesFromDisease } =
    moleculeNamesFromDiseaseResult(primaryDisease)

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

  // Optional synthetic indications from OT maxPhase when ChEMBL indications empty
  const knownDrugPhaseByName = new Map(
    knownDrugsGather.drugs.map((d) => [d.name.toLowerCase(), d.maxPhase]),
  )
  const chemblPhaseByName = new Map(
    chemblByTargetGather.molecules.map((m) => [m.name.toLowerCase(), m.maxPhase]),
  )

  const candidates: CandidateMolecule[] = []

  for (const name of moleculeArray) {
    const lowerName = name.toLowerCase()
    const cid = cidMap.get(lowerName) ?? null
    const targetMol = moleculesFromTargets.find((m) => m.name.toLowerCase() === lowerName)
    const trialCount =
      moleculesFromTrials.get(name) ?? moleculesFromTrials.get(lowerName) ?? 0
    let indications = indicationMap.get(name) ?? []

    // If no ChEMBL indication rows, lift phase from OT known drug or ChEMBL activity
    if (indications.length === 0) {
      const otPhase = knownDrugPhaseByName.get(lowerName) ?? 0
      const chemblPhase = chemblPhaseByName.get(lowerName) ?? 0
      const phase = Math.max(otPhase, chemblPhase)
      if (phase > 0) {
        indications = [
          {
            meshHeading: diseaseName,
            efoTerm: diseaseName,
            maxPhaseForIndication: phase,
          },
        ]
      }
    }

    const sources: string[] = []
    if (targetMol) sources.push('DGIdb')
    if (trialCount > 0) sources.push('ClinicalTrials')
    if (knownDrugNames.some((n) => n.toLowerCase() === lowerName)) {
      sources.push('Open Targets')
    }
    if (chemblByTargetNames.some((n) => n.toLowerCase() === lowerName)) {
      sources.push('ChEMBL')
    }
    if (moleculeNamesFromDisease.some((n) => n.toLowerCase() === lowerName)) {
      sources.push(primaryDisease.source)
    }
    if (indications.length > 0 && !sources.includes('ChEMBL')) {
      // Indication enrichment alone still credits ChEMBL
      if ((indicationMap.get(name) ?? []).length > 0) sources.push('ChEMBL')
    }

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

  const v2 = mapRankResultToDiscoveryResult(rank, { generatedAt })
  // Attach resolved InChIKey / IdentityTrust / ik: candidateIds on DiscoveryResult candidates
  v2.candidates = applyResolvedIdentities(v2.candidates, identityLookup.value.resolved)
  v2.sourceStatuses = sourceStatuses
  // Merge engine warnings with mapper warnings (dedupe)
  const warningSet = new Set([...v2.warnings, ...warnings])
  v2.warnings = Array.from(warningSet)
  v2.timingMs = {
    identity: identityLookup.status.duration_ms ?? identityLookup.value.durationMs,
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
