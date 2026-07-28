import {
  similarToLegacyCandidate,
  RANK_SIMILARITY_SCORE_PENALTY,
  expandRankShortlistBySimilarity,
} from '@/lib/discovery/similarityExpand'
import type { CandidateMolecule } from '@/lib/discovery/types'

jest.mock('@/lib/api/pubchem-similar', () => ({
  getSimilarMolecules: jest.fn().mockResolvedValue([
    {
      cid: 999,
      name: 'AnalogX',
      formula: 'C10',
      molecularWeight: 100,
      imageUrl: '',
    },
  ]),
}))

describe('similarity expand rank helpers', () => {
  it('applies novelty penalty relative to seed', () => {
    const seed: CandidateMolecule = {
      name: 'Seed',
      cid: 1,
      clinicalPhase: 0.8,
      geneAssociationScore: 0.5,
      sharedTargetRatio: 0.3,
      trialCountNorm: 0.2,
      clinicalPhaseRaw: 3,
      sharedTargetCountRaw: 1,
      trialCountRaw: 2,
      geneScoreRaw: 0.5,
      sources: ['ChEMBL'],
      confidence: 'moderate',
      compositeScore: 0.8,
    }
    const c = similarToLegacyCandidate(
      { cid: 2, name: 'Analog', formula: '', molecularWeight: 1, imageUrl: '' },
      seed,
    )
    expect(c.sources).toContain('PubChem similar')
    expect(c.compositeScore).toBeCloseTo(0.8 * RANK_SIMILARITY_SCORE_PENALTY, 5)
    expect(c.cid).toBe(2)
  })

  it('expandRankShortlistBySimilarity adds neighbors', async () => {
    const seed: CandidateMolecule = {
      name: 'Seed',
      cid: 2244,
      clinicalPhase: 0.5,
      geneAssociationScore: 0.2,
      sharedTargetRatio: 0.1,
      trialCountNorm: 0,
      clinicalPhaseRaw: 2,
      sharedTargetCountRaw: 0,
      trialCountRaw: 0,
      geneScoreRaw: 0,
      sources: ['DGIdb'],
      confidence: 'preliminary',
      compositeScore: 0.5,
    }
    const r = await expandRankShortlistBySimilarity([seed])
    expect(r.added).toBeGreaterThanOrEqual(1)
    expect(r.candidates[0]?.name).toBe('AnalogX')
    expect(r.warnings.some((w) => /Similarity expand/i.test(w))).toBe(true)
  })
})
