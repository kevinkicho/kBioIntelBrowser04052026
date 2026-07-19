import type { CandidateMolecule } from '@/lib/discovery/types'
import type { MoleculeCandidate } from '@/lib/domain'
import type { AiRankCandidateInput } from './types'

export function candidateKey(c: {
  name: string
  cid: number | null
  candidateId?: string
}): string {
  if (c.candidateId) return c.candidateId
  if (c.cid != null && c.cid > 0) return `cid:${c.cid}`
  return `name:${c.name.trim().toLowerCase()}`
}

export function buildAiRankInputsFromLegacy(
  candidates: CandidateMolecule[],
): AiRankCandidateInput[] {
  return candidates.map((c, i) => ({
    key: candidateKey(c),
    name: c.name,
    cid: c.cid,
    ofRecordRank: i + 1,
    compositeScore: c.compositeScore,
    clinicalPhaseRaw: c.clinicalPhaseRaw,
    trialCountRaw: c.trialCountRaw,
    sharedTargetCountRaw: c.sharedTargetCountRaw,
    geneScoreRaw: c.geneScoreRaw,
    sources: c.sources.slice(0, 8),
    confidence: c.confidence,
  }))
}

export function buildAiRankInputsFromBoard(
  candidates: MoleculeCandidate[],
): AiRankCandidateInput[] {
  return candidates.map((c, i) => ({
    key: c.candidateId,
    name: c.identity.name,
    cid: c.identity.pubchemCid,
    ofRecordRank: i + 1,
    compositeScore: c.scores?.composite ?? 0,
    clinicalPhaseRaw: 0,
    trialCountRaw: 0,
    sharedTargetCountRaw: 0,
    geneScoreRaw: 0,
    sources: c.evidenceBreadthSources?.slice(0, 8) ?? [],
    confidence: c.boardStatus ?? 'untriaged',
    axes: c.scores?.axes
      ? {
          efficacy: c.scores.axes.efficacy,
          clinicalStage: c.scores.axes.clinicalStage,
          safety: c.scores.axes.safety,
          novelty: c.scores.axes.novelty,
          identityTrust: c.scores.axes.identityTrust,
        }
      : undefined,
  }))
}

/** Compact JSON for the model (token-efficient). */
export function formatAiRankContextBlock(
  diseaseName: string,
  inputs: AiRankCandidateInput[],
  userGoal?: string,
): string {
  const rows = inputs.slice(0, 25).map((c) => ({
    key: c.key,
    name: c.name,
    cid: c.cid,
    ofRecordRank: c.ofRecordRank,
    composite: Number(c.compositeScore.toFixed(3)),
    phase: c.clinicalPhaseRaw,
    trials: c.trialCountRaw,
    sharedTargets: c.sharedTargetCountRaw,
    geneScore: c.geneScoreRaw,
    sources: c.sources,
    confidence: c.confidence,
    axes: c.axes,
  }))
  return [
    `Disease / context: ${diseaseName}`,
    userGoal?.trim() ? `User goal: ${userGoal.trim()}` : null,
    `Of-record shortlist (deterministic; do not invent new molecules):`,
    JSON.stringify(rows, null, 0),
  ]
    .filter(Boolean)
    .join('\n')
}
