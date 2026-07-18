import { rerankCandidatesClient } from '@/lib/discovery/clientRerank'
import { createDefaultScoreRubric } from '@/lib/domain/score'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import type { MoleculeCandidate } from '@/lib/domain/entities'

function legacy(name: string, score: number): CandidateMolecule {
  return {
    name,
    compositeScore: score,
    clinicalPhase: 0.5,
    clinicalPhaseRaw: 2,
    geneAssociationScore: 0.5,
    sharedTargetRatio: 0.2,
    sharedTargetCountRaw: 1,
    trialCountNorm: 0.3,
    trialCountRaw: 5,
    sources: ['chembl'],
    confidence: 'moderate',
  } as CandidateMolecule
}

function domain(
  name: string,
  axes: { efficacy: number; clinicalStage: number; safety: number | null; novelty: number; identityTrust: number },
): MoleculeCandidate {
  const rubric = createDefaultScoreRubric('balanced')
  return {
    candidateId: `name:${name}`,
    identity: {
      name,
      synonyms: [],
      pubchemCid: null,
      identityTrust: 'medium',
    },
    scores: {
      composite: 0.5,
      axes: {
        efficacy: axes.efficacy,
        clinicalStage: axes.clinicalStage,
        safety: axes.safety,
        novelty: axes.novelty,
        identityTrust: axes.identityTrust,
      },
      axisStatus: {
        efficacy: 'computed',
        clinicalStage: 'computed',
        safety: axes.safety == null ? 'not-retrieved' : 'computed',
        novelty: 'computed',
        identityTrust: 'computed',
      },
      rubricVersion: 1,
      scorePhase: 'cheap',
      weights: rubric.weights,
    },
  } as unknown as MoleculeCandidate
}

describe('rerankCandidatesClient', () => {
  it('reorders when weights change toward efficacy', () => {
    const leg = [legacy('A', 0.6), legacy('B', 0.55)]
    const dom = [
      domain('A', { efficacy: 0.2, clinicalStage: 0.9, safety: 0.5, novelty: 0.1, identityTrust: 0.8 }),
      domain('B', { efficacy: 0.95, clinicalStage: 0.2, safety: 0.5, novelty: 0.8, identityTrust: 0.7 }),
    ]
    const novel = createDefaultScoreRubric('novel-bioactive')
    const rows = rerankCandidatesClient(leg, dom, novel)
    expect(rows[0].name).toBe('B')
    expect(rows[0].newRank).toBe(1)
    expect(rows.find((r) => r.name === 'B')!.rankDelta).toBeGreaterThan(0)
  })
})
