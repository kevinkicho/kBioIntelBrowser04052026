import { buildCandidateWhy } from '@/lib/discovery/candidateWhy'
import type { CandidateMolecule } from '@/lib/discovery/types'

function base(over: Partial<CandidateMolecule> = {}): CandidateMolecule {
  return {
    name: 'Metformin',
    cid: 4091,
    clinicalPhase: 0.8,
    geneAssociationScore: 0.5,
    sharedTargetRatio: 0.3,
    trialCountNorm: 0.4,
    clinicalPhaseRaw: 4,
    sharedTargetCountRaw: 2,
    trialCountRaw: 12,
    geneScoreRaw: 0.71,
    sources: ['ClinicalTrials', 'DGIdb'],
    confidence: 'high',
    compositeScore: 0.82,
    ...over,
  }
}

describe('buildCandidateWhy', () => {
  it('includes phase, trials, targets, and sources', () => {
    const why = buildCandidateWhy(base(), 'Type 2 diabetes')
    expect(why).toMatch(/Why ranked/)
    expect(why).toMatch(/Approved/)
    expect(why).toMatch(/12 trial/)
    expect(why).toMatch(/2 shared target/)
    expect(why).toMatch(/ClinicalTrials/)
    expect(why).toMatch(/82%/)
  })

  it('handles empty signal gracefully', () => {
    const why = buildCandidateWhy(
      base({
        clinicalPhaseRaw: 0,
        trialCountRaw: 0,
        sharedTargetCountRaw: 0,
        geneScoreRaw: 0,
        geneAssociationScore: 0,
        sources: [],
        compositeScore: 0.1,
      }),
      'X',
    )
    expect(why).toMatch(/deterministic rubric/i)
  })
})
