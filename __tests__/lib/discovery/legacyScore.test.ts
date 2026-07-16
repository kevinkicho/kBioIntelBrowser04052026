import {
  confidenceFromSources,
  scoreLegacyCandidate,
  sortCandidates,
  W_CLINICAL_PHASE,
  W_GENE_ASSOCIATION,
  W_SHARED_TARGET,
  W_TRIAL_COUNT,
} from '@/lib/discovery/legacyScore'
import type { TargetRelatedMolecule } from '@/lib/api/dgidb'

describe('legacyScore', () => {
  it('weights sum to 1.0 (formula freeze)', () => {
    expect(W_CLINICAL_PHASE + W_GENE_ASSOCIATION + W_SHARED_TARGET + W_TRIAL_COUNT).toBeCloseTo(
      1,
      10,
    )
  })

  it('confidenceFromSources thresholds', () => {
    expect(confidenceFromSources(['DGIdb'])).toBe('preliminary')
    expect(confidenceFromSources(['DGIdb', 'ClinicalTrials'])).toBe('moderate')
    expect(confidenceFromSources(['DGIdb', 'ClinicalTrials', 'ChEMBL', 'Open Targets'])).toBe(
      'high',
    )
    expect(confidenceFromSources(['a', 'a', 'b'])).toBe('moderate')
  })

  it('scoreLegacyCandidate uses original composite formula', () => {
    const targetMol: TargetRelatedMolecule = {
      name: 'Donepezil',
      sharedTargets: ['ACHE', 'BCHE'],
      interactionTypes: ['inhibitor'],
      sources: ['DrugBank'],
    }
    const c = scoreLegacyCandidate({
      name: 'Donepezil',
      cid: 3152,
      diseaseName: 'Alzheimer disease',
      targetMol,
      trialCount: 10,
      maxTrialCount: 10,
      genes: [
        { symbol: 'ACHE', score: 0.9, source: 'Open Targets' },
        { symbol: 'BCHE', score: 0.5, source: 'Open Targets' },
      ],
      topTargetCount: 5,
      indications: [
        {
          meshHeading: 'Alzheimer Disease',
          efoTerm: 'Alzheimer disease',
          maxPhaseForIndication: 4,
        },
      ],
      sources: ['DGIdb', 'ClinicalTrials', 'ChEMBL'],
    })

    // clinicalPhaseNorm = 1, gene = 0.9, shared = 2/5 = 0.4, trial = 1
    const expected =
      W_CLINICAL_PHASE * 1 +
      W_GENE_ASSOCIATION * 0.9 +
      W_SHARED_TARGET * 0.4 +
      W_TRIAL_COUNT * 1
    expect(c.compositeScore).toBeCloseTo(expected, 5)
    expect(c.clinicalPhaseRaw).toBe(4)
    expect(c.confidence).toBe('moderate')
    expect(c.cid).toBe(3152)
  })

  it('sortCandidates ranks by composite then source count then name', () => {
    const sorted = sortCandidates([
      {
        name: 'B',
        cid: null,
        clinicalPhase: 0,
        geneAssociationScore: 0,
        sharedTargetRatio: 0,
        trialCountNorm: 0,
        clinicalPhaseRaw: 0,
        sharedTargetCountRaw: 0,
        trialCountRaw: 0,
        geneScoreRaw: 0,
        sources: ['a'],
        confidence: 'preliminary',
        compositeScore: 0.5,
      },
      {
        name: 'A',
        cid: null,
        clinicalPhase: 0,
        geneAssociationScore: 0,
        sharedTargetRatio: 0,
        trialCountNorm: 0,
        clinicalPhaseRaw: 0,
        sharedTargetCountRaw: 0,
        trialCountRaw: 0,
        geneScoreRaw: 0,
        sources: ['a', 'b'],
        confidence: 'moderate',
        compositeScore: 0.5,
      },
      {
        name: 'C',
        cid: null,
        clinicalPhase: 0,
        geneAssociationScore: 0,
        sharedTargetRatio: 0,
        trialCountNorm: 0,
        clinicalPhaseRaw: 0,
        sharedTargetCountRaw: 0,
        trialCountRaw: 0,
        geneScoreRaw: 0,
        sources: [],
        confidence: 'preliminary',
        compositeScore: 0.9,
      },
    ])
    expect(sorted.map((c) => c.name)).toEqual(['C', 'A', 'B'])
  })
})
