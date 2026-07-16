/**
 * Best-effort mappers from legacy candidateRanker DTOs → domain types.
 */

import type { CandidateMolecule as LegacyCandidate, RankResult } from '../candidateRanker'
import { computeCandidateId } from './candidateId'
import type {
  CandidateOrigin,
  DiseaseEntity,
  MoleculeCandidate,
  MoleculeIdentity,
  TargetEntity,
} from './entities'
import { assessIdentityTrust } from './identity'
import type { DiscoveryResult } from './discoveryResult'
import {
  computeComposite,
  createDefaultScoreRubric,
  createEmptyScoreVector,
  type ScoreRubric,
  type ScoreVector,
} from './score'

const SOURCE_TO_ORIGIN: Record<string, CandidateOrigin> = {
  dgidb: 'dgidb',
  clinicaltrials: 'clinicaltrials-intervention',
  'clinical trials': 'clinicaltrials-intervention',
  chembl: 'chembl-indication',
  'open targets': 'opentargets-known-drug',
  opentargets: 'opentargets-known-drug',
  bindingdb: 'bindingdb-enrichment',
}

function mapSourcesToOrigins(sources: string[]): CandidateOrigin[] {
  const origins = new Set<CandidateOrigin>()
  for (const s of sources) {
    const key = s.trim().toLowerCase()
    const mapped = SOURCE_TO_ORIGIN[key]
    if (mapped) {
      origins.add(mapped)
      continue
    }
    if (key.includes('dgidb')) origins.add('dgidb')
    else if (key.includes('clinical')) origins.add('clinicaltrials-intervention')
    else if (key.includes('chembl')) origins.add('chembl-indication')
    else if (key.includes('open target')) origins.add('opentargets-known-drug')
    else if (key.includes('binding')) origins.add('bindingdb-enrichment')
  }
  if (origins.size === 0) origins.add('manual')
  return Array.from(origins)
}

/**
 * Map legacy CandidateMolecule → MoleculeCandidate.
 * Legacy map: clinicalPhase→clinicalStage; gene/shared→efficacy; compositeScore→composite.
 * Safety/novelty remain null (not-retrieved) until harvest.
 */
export function mapLegacyCandidateToMoleculeCandidate(
  legacy: LegacyCandidate,
  options?: { rubric?: ScoreRubric; diseaseId?: string | null },
): MoleculeCandidate {
  const rubric = options?.rubric ?? createDefaultScoreRubric('balanced')
  const cid = legacy.cid ?? null

  const trust = assessIdentityTrust({
    cid,
    name: legacy.name,
  })

  const identity: MoleculeIdentity = {
    name: legacy.name,
    synonyms: [],
    pubchemCid: cid,
    identityTrust: trust.level,
  }

  const candidateId = computeCandidateId({
    name: legacy.name,
    pubchemCid: cid,
  })

  const scores = mapLegacyScores(legacy, rubric, trust.axisValue)

  const links =
    options?.diseaseId != null && options.diseaseId !== ''
      ? [
          {
            type: 'associated' as const,
            diseaseId: options.diseaseId,
            evidenceRefIds: [],
          },
        ]
      : []

  return {
    candidateId,
    identity,
    origins: mapSourcesToOrigins(legacy.sources ?? []),
    evidenceBreadthSources: [...(legacy.sources ?? [])],
    links,
    scores,
    boardStatus: 'untriaged',
  }
}

function mapLegacyScores(
  legacy: LegacyCandidate,
  rubric: ScoreRubric,
  identityTrustAxis: number,
): ScoreVector {
  const base = createEmptyScoreVector('cheap', rubric)

  // efficacy: prefer max of gene association + shared target ratio (both 0–1 proxies)
  const efficacyParts = [legacy.geneAssociationScore, legacy.sharedTargetRatio].filter(
    (n) => typeof n === 'number' && !Number.isNaN(n),
  )
  const efficacy =
    efficacyParts.length > 0 ? Math.min(1, Math.max(0, Math.max(...efficacyParts))) : null

  const clinicalStage =
    typeof legacy.clinicalPhase === 'number' && !Number.isNaN(legacy.clinicalPhase)
      ? Math.min(1, Math.max(0, legacy.clinicalPhase))
      : null

  const axes: ScoreVector['axes'] = {
    efficacy,
    clinicalStage,
    safety: null,
    novelty: null,
    identityTrust: identityTrustAxis,
  }

  const axisStatus: ScoreVector['axisStatus'] = {
    efficacy: efficacy != null ? 'computed' : 'empty',
    clinicalStage: clinicalStage != null ? 'computed' : 'empty',
    safety: 'not-retrieved',
    novelty: 'not-retrieved',
    identityTrust: 'computed',
  }

  // Always recompute from mapped axes — never overwrite a legitimate 0 composite
  // with legacy.compositeScore (axes-all-zero is a valid cheap score).
  const composite = computeComposite(axes, rubric)

  return {
    ...base,
    composite,
    axes,
    axisStatus,
    rubricId: rubric.preset,
    weights: { ...rubric.weights },
    scorePhase: 'cheap',
  }
}

/**
 * Best-effort RankResult → DiscoveryResult (v2).
 * Does not invent disease confirmation UX state beyond single primary disease.
 */
export function mapRankResultToDiscoveryResult(
  rank: RankResult,
  options?: { rubric?: ScoreRubric; generatedAt?: string },
): DiscoveryResult {
  const rubric = options?.rubric ?? createDefaultScoreRubric('balanced')
  const generatedAt =
    options?.generatedAt ?? rank.generatedAt ?? new Date().toISOString()

  const disease: DiseaseEntity | null = rank.diseaseName
    ? {
        id: rank.diseaseId ?? rank.diseaseName,
        idNamespace: rank.diseaseId ? 'ot' : 'name',
        name: rank.diseaseName,
        synonyms: [],
        therapeuticAreas: rank.therapeuticAreas ?? [],
        xrefs: rank.diseaseId ? [{ system: 'ot', id: rank.diseaseId }] : [],
        // Name-only disease (no registry id) → unresolved, consistent with molecule name-only
        identityTrust: rank.diseaseId ? 'medium' : 'unresolved',
      }
    : null

  const targets: TargetEntity[] = (rank.genes ?? []).map((g) => ({
    id: g.symbol,
    symbol: g.symbol,
    uniprotAccessions: [],
    organism: 'human',
    associationToDisease: disease
      ? {
          diseaseId: disease.id,
          score: g.score,
          source: g.source,
        }
      : undefined,
    identityTrust: 'medium',
  }))

  const candidates = (rank.candidates ?? []).map((c) =>
    mapLegacyCandidateToMoleculeCandidate(c, {
      rubric,
      diseaseId: rank.diseaseId,
    }),
  )

  const warnings: string[] = [...(rank.warnings ?? [])]
  if (!rank.diseaseId) {
    const msg = 'Disease id missing — ranked from name only (legacy path).'
    if (!warnings.includes(msg)) warnings.push(msg)
  }

  return {
    schemaVersion: 2,
    query: rank.query,
    disease,
    diseaseCandidates: disease ? [disease] : [],
    needsDiseaseConfirmation: false,
    targets,
    candidates,
    sourceStatuses: rank.sourceStatuses ? [...rank.sourceStatuses] : [],
    rubric,
    generatedAt,
    warnings,
    scorePhase: 'cheap',
  }
}
