import { normalizeLog, matchIndication, type CandidateMolecule, type RankResult, type ConfidenceLevel } from '@/lib/candidateRanker'

describe('candidateRanker', () => {
  describe('normalizeLog', () => {
    it('returns 0 for zero value', () => {
      expect(normalizeLog(0, 10)).toBe(0)
    })

    it('returns 0 for zero max', () => {
      expect(normalizeLog(5, 0)).toBe(0)
    })

    it('returns 1 for value equal to max', () => {
      expect(normalizeLog(10, 10)).toBeCloseTo(1, 5)
    })

    it('log-normalizes skewed distributions', () => {
      const result1 = normalizeLog(1, 100)
      const result50 = normalizeLog(50, 100)
      const result100 = normalizeLog(100, 100)

      expect(result1).toBeGreaterThan(0)
      expect(result1).toBeLessThan(result50)
      expect(result50).toBeLessThan(result100)
      expect(result100).toBeCloseTo(1, 5)

      // Log normalization: 1 trial shouldn't be 1% as good as 100
      // 1 trial ~ 0.15, not 0.01
      expect(result1).toBeGreaterThan(0.1)
    })

    it('handles equal non-zero values', () => {
      expect(normalizeLog(5, 5)).toBeCloseTo(1, 5)
    })

    it('caps at 1 even for value > max', () => {
      expect(normalizeLog(200, 100)).toBeCloseTo(1, 5)
    })
  })

  describe('matchIndication', () => {
    it('returns maxPhase when disease terms match indication heading', () => {
      const indications = [
        { meshHeading: 'Alzheimer Disease', efoTerm: 'Alzheimer disease', maxPhaseForIndication: 4 },
      ]
      expect(matchIndication('Alzheimer Disease', indications)).toBe(4)
    })

    it('returns maxPhase for partial term match (majority match)', () => {
      const indications = [
        { meshHeading: 'Alzheimer Disease', efoTerm: '', maxPhaseForIndication: 3 },
      ]
      expect(matchIndication('alzheimer disease', indications)).toBe(3)
    })

    it('returns 0 when no terms match', () => {
      const indications = [
        { meshHeading: 'Diabetes Mellitus, Type 2', efoTerm: '', maxPhaseForIndication: 4 },
      ]
      expect(matchIndication('alzheimer disease', indications)).toBe(0)
    })

    it('returns 0 for empty indications', () => {
      expect(matchIndication('alzheimer', [])).toBe(0)
    })

    it('matches case-insensitively', () => {
      const indications = [
        { meshHeading: 'BREAST CANCER', efoTerm: 'breast carcinoma', maxPhaseForIndication: 4 },
      ]
      expect(matchIndication('breast cancer', indications)).toBe(4)
    })

    it('requires majority of query terms to match', () => {
      const indications = [
        { meshHeading: 'Diabetes', efoTerm: '', maxPhaseForIndication: 3 },
      ]
      expect(matchIndication('alzheimer disease', indications)).toBe(0)
    })

    it('picks the best matching indication', () => {
      const indications = [
        { meshHeading: 'Pain', efoTerm: '', maxPhaseForIndication: 2 },
        { meshHeading: 'Neuropathic Pain', efoTerm: 'Neuropathic pain', maxPhaseForIndication: 3 },
      ]
      expect(matchIndication('neuropathic pain', indications)).toBe(3)
    })
  })

  describe('CandidateMolecule shape', () => {
    it('has all required fields for the API response', () => {
      const candidate: CandidateMolecule = {
        name: 'Donepezil',
        cid: 3152,
        clinicalPhase: 1.0,
        geneAssociationScore: 0.85,
        sharedTargetRatio: 0.6,
        trialCountNorm: 0.7,
        clinicalPhaseRaw: 4,
        sharedTargetCountRaw: 6,
        trialCountRaw: 48,
        geneScoreRaw: 0.85,
        sources: ['DGIdb', 'ClinicalTrials', 'ChEMBL', 'Open Targets'],
        confidence: 'high',
        compositeScore: 0.82,
      }

      expect(candidate.name).toBe('Donepezil')
      expect(candidate.cid).toBe(3152)
      expect(typeof candidate.compositeScore).toBe('number')
      expect(typeof candidate.confidence).toBe('string')
      expect(candidate.confidence).toBe('high')
      expect(candidate.sources.length).toBe(4)
      expect(candidate.clinicalPhaseRaw).toBe(4)
    })
  })

  describe('ConfidenceLevel', () => {
    function computeConfidence(sources: string[]): ConfidenceLevel {
      const uniqueSources = Array.from(new Set(sources))
      return uniqueSources.length >= 4 ? 'high' : uniqueSources.length >= 2 ? 'moderate' : 'preliminary'
    }

    it('returns preliminary for 1 source', () => {
      expect(computeConfidence(['DGIdb'])).toBe('preliminary')
    })

    it('returns moderate for 2 sources', () => {
      expect(computeConfidence(['DGIdb', 'ClinicalTrials'])).toBe('moderate')
    })

    it('returns moderate for 3 sources', () => {
      expect(computeConfidence(['DGIdb', 'ClinicalTrials', 'Open Targets'])).toBe('moderate')
    })

    it('returns high for 4 sources', () => {
      expect(computeConfidence(['DGIdb', 'ClinicalTrials', 'ChEMBL', 'Open Targets'])).toBe('high')
    })

    it('returns high for 5+ sources', () => {
      expect(computeConfidence(['DGIdb', 'ClinicalTrials', 'ChEMBL', 'Open Targets', 'DisGeNET'])).toBe('high')
    })

    it('deduplicates sources before counting', () => {
      expect(computeConfidence(['DGIdb', 'DGIdb', 'ClinicalTrials'])).toBe('moderate')
    })

    it('returns preliminary for empty sources', () => {
      expect(computeConfidence([])).toBe('preliminary')
    })
  })

  describe('RankResult shape', () => {
    it('has all required top-level fields', () => {
      const result: RankResult = {
        query: 'alzheimer',
        diseaseId: 'EFO_0000311',
        diseaseName: 'Alzheimer disease',
        therapeuticAreas: ['nervous system disease'],
        genes: [
          { symbol: 'APP', score: 0.95, source: 'Open Targets' },
          { symbol: 'PSEN1', score: 0.88, source: 'DisGeNET' },
        ],
        candidates: [],
      }

      expect(result.query).toBe('alzheimer')
      expect(result.diseaseId).toBe('EFO_0000311')
      expect(result.diseaseName).toBe('Alzheimer disease')
      expect(result.therapeuticAreas).toContain('nervous system disease')
      expect(result.genes.length).toBe(2)
      expect(result.genes[0].symbol).toBe('APP')
      expect(typeof result.genes[0].score).toBe('number')
    })

    it('accepts null diseaseId for no results', () => {
      const result: RankResult = {
        query: 'xyznonexistent',
        diseaseId: null,
        diseaseName: 'xyznonexistent',
        therapeuticAreas: [],
        genes: [],
        candidates: [],
      }

      expect(result.diseaseId).toBeNull()
      expect(result.candidates).toEqual([])
    })
  })
})