/**
 * Client-side re-rank of Discover shortlist under a new rubric.
 * Reuses existing ScoreVector axes — no LLM, no network.
 */

import {
  computeComposite,
  type ScoreAxisWeights,
  type ScoreRubric,
  type ScoreVector,
} from '@/lib/domain/score'
import type { MoleculeCandidate } from '@/lib/domain/entities'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import { mapLegacyCandidateToMoleculeCandidate } from '@/lib/domain'

export interface RerankedRow {
  /** Stable id for matching */
  key: string
  name: string
  /** 1-based rank under original result order */
  originalRank: number
  /** 1-based rank under what-if rubric */
  newRank: number
  originalComposite: number
  newComposite: number
  rankDelta: number
  compositeDelta: number
  scores: ScoreVector
  legacy: CandidateMolecule
  domain?: MoleculeCandidate
}

function candidateKey(c: CandidateMolecule, domain?: MoleculeCandidate): string {
  return (
    domain?.candidateId ||
    (domain?.identity.pubchemCid != null ? `cid:${domain.identity.pubchemCid}` : '') ||
    c.name
  )
}

/**
 * Recompute composites from existing axes + new weights; sort desc.
 * Falls back to legacy compositeScore when no ScoreVector axes exist.
 */
export function rerankCandidatesClient(
  legacy: CandidateMolecule[],
  domainList: MoleculeCandidate[] | undefined,
  rubric: Pick<ScoreRubric, 'weights' | 'missingAxisPolicy' | 'penalizeValue' | 'preset'>,
): RerankedRow[] {
  const rows = legacy.map((leg, i) => {
    const domain =
      domainList?.[i] ??
      mapLegacyCandidateToMoleculeCandidate(leg, { rubric: createFallbackRubric(rubric) })
    const scores = domain.scores
    const originalComposite =
      typeof scores?.composite === 'number'
        ? scores.composite
        : typeof leg.compositeScore === 'number'
          ? leg.compositeScore
          : 0

    let newComposite = originalComposite
    let nextScores = scores
    if (scores?.axes) {
      newComposite = computeComposite(scores.axes, rubric)
      nextScores = {
        ...scores,
        composite: newComposite,
        weights: { ...rubric.weights },
        rubricId: rubric.preset,
      }
    }

    return {
      key: candidateKey(leg, domain),
      name: leg.name,
      originalRank: i + 1,
      newRank: 0,
      originalComposite,
      newComposite,
      rankDelta: 0,
      compositeDelta: newComposite - originalComposite,
      scores: nextScores ?? {
        composite: newComposite,
        axes: {
          efficacy: null,
          clinicalStage: null,
          safety: null,
          novelty: null,
          identityTrust: null,
        },
        axisStatus: {
          efficacy: 'not-retrieved' as const,
          clinicalStage: 'not-retrieved' as const,
          safety: 'not-retrieved' as const,
          novelty: 'not-retrieved' as const,
          identityTrust: 'not-retrieved' as const,
        },
        rubricVersion: 1 as const,
        scorePhase: 'cheap' as const,
      },
      legacy: leg,
      domain,
    }
  })

  rows.sort((a, b) => b.newComposite - a.newComposite || a.originalRank - b.originalRank)
  rows.forEach((r, idx) => {
    r.newRank = idx + 1
    r.rankDelta = r.originalRank - r.newRank // positive = improved
  })
  return rows
}

function createFallbackRubric(
  r: Pick<ScoreRubric, 'weights' | 'missingAxisPolicy' | 'penalizeValue' | 'preset'>,
): ScoreRubric {
  return {
    version: 1,
    weights: { ...r.weights },
    missingAxisPolicy: r.missingAxisPolicy,
    penalizeValue: r.penalizeValue,
    preset: r.preset,
    aeAggressiveness: 'soft-flag',
  }
}

export function weightsFromPresetOrCustom(
  weights: ScoreAxisWeights,
): ScoreAxisWeights {
  return { ...weights }
}
