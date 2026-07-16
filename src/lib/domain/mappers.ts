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
  createDefaultScoreRubric,
  type ScoreRubric,
  type ScoreVector,
} from './score'
import { buildScoreVector } from '../discovery/scoreAxes'

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
  // Multi-axis cheap formulas (PR4): efficacy / clinicalStage / identityTrust;
  // safety + novelty remain not-retrieved until harvest.
  return buildScoreVector({
    rubric,
    scorePhase: 'cheap',
    cheap: {
      geneAssociationScore: legacy.geneAssociationScore,
      sharedTargetRatio: legacy.sharedTargetRatio,
      maxPhase: legacy.clinicalPhaseRaw,
      trialNorm: legacy.trialCountNorm,
      identityTrust: identityTrustAxis,
      sources: legacy.sources,
    },
  })
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
