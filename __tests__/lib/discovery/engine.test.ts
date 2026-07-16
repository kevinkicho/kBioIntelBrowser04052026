/**
 * Golden fixtures: RankResult shape stability + OT decontamination + dual schema.
 */

import {
  normalizeLog,
  matchIndication,
  moleculeNamesFromDiseaseResult,
  OT_KNOWN_DRUGS_DECONTAMINATION_WARNING,
  type CandidateMolecule,
  type RankResult,
  type ConfidenceLevel,
} from '@/lib/discovery'
import { isDiscoveryResult } from '@/lib/domain/discoveryResult'
import type { DiseaseResult } from '@/lib/diseaseSearch'

/** Golden legacy candidate shape (Discover UI / export contract). */
const GOLDEN_CANDIDATE: CandidateMolecule = {
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

const GOLDEN_RANK_REQUIRED_KEYS = [
  'query',
  'diseaseId',
  'diseaseName',
  'therapeuticAreas',
  'genes',
  'candidates',
] as const

const GOLDEN_CANDIDATE_KEYS = [
  'name',
  'cid',
  'clinicalPhase',
  'geneAssociationScore',
  'sharedTargetRatio',
  'trialCountNorm',
  'clinicalPhaseRaw',
  'sharedTargetCountRaw',
  'trialCountRaw',
  'geneScoreRaw',
  'sources',
  'confidence',
  'compositeScore',
] as const

describe('discovery engine contracts', () => {
  describe('golden RankResult shape', () => {
    it('keeps required legacy fields stable for fixtures', () => {
      const result: RankResult = {
        query: 'alzheimer',
        diseaseId: 'EFO_0000249',
        diseaseName: 'Alzheimer disease',
        therapeuticAreas: ['nervous system disease'],
        genes: [
          { symbol: 'APP', score: 0.95, source: 'Open Targets' },
          { symbol: 'PSEN1', score: 0.88, source: 'DisGeNET' },
        ],
        candidates: [GOLDEN_CANDIDATE],
        sourceStatuses: [
          {
            source: 'DGIdb',
            status: 'loaded',
            has_data: true,
            duration_ms: 120,
          },
        ],
        generatedAt: '2026-04-07T12:00:00.000Z',
        warnings: [OT_KNOWN_DRUGS_DECONTAMINATION_WARNING],
      }

      for (const key of GOLDEN_RANK_REQUIRED_KEYS) {
        expect(result).toHaveProperty(key)
      }

      expect(result.query).toBe('alzheimer')
      expect(result.diseaseId).toBe('EFO_0000249')
      expect(result.candidates).toHaveLength(1)

      for (const key of GOLDEN_CANDIDATE_KEYS) {
        expect(result.candidates[0]).toHaveProperty(key)
      }

      // Additive PR3a fields remain optional on the type but present when engine fills them
      expect(result.sourceStatuses?.[0]?.source).toBe('DGIdb')
      expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(result.warnings).toContain(OT_KNOWN_DRUGS_DECONTAMINATION_WARNING)
    })

    it('accepts empty result without optional fields (backward compatible)', () => {
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
      expect(result.v2).toBeUndefined()
      expect(result.sourceStatuses).toBeUndefined()
    })

    it('dual-schema v2 satisfies DiscoveryResult guard', () => {
      const result: RankResult = {
        query: 'alzheimer',
        diseaseId: 'EFO_0000249',
        diseaseName: 'Alzheimer disease',
        therapeuticAreas: [],
        genes: [],
        candidates: [GOLDEN_CANDIDATE],
        generatedAt: '2026-04-07T12:00:00.000Z',
        sourceStatuses: [],
        warnings: [],
        v2: {
          schemaVersion: 2,
          query: 'alzheimer',
          disease: {
            id: 'EFO_0000249',
            idNamespace: 'ot',
            name: 'Alzheimer disease',
            synonyms: [],
            therapeuticAreas: [],
            xrefs: [{ system: 'ot', id: 'EFO_0000249' }],
            identityTrust: 'medium',
          },
          needsDiseaseConfirmation: false,
          targets: [],
          candidates: [],
          sourceStatuses: [],
          rubric: {
            version: 1,
            weights: {
              efficacy: 0.3,
              clinicalStage: 0.25,
              safety: 0.25,
              novelty: 0.1,
              identityTrust: 0.1,
            },
            missingAxisPolicy: 'renormalize',
            preset: 'balanced',
            aeAggressiveness: 'soft-flag',
          },
          generatedAt: '2026-04-07T12:00:00.000Z',
          warnings: [],
          scorePhase: 'cheap',
        },
      }

      expect(isDiscoveryResult(result.v2)).toBe(true)
      expect(result.v2?.schemaVersion).toBe(2)
      // Legacy clients still see candidates at top level
      expect(result.candidates[0].name).toBe('Donepezil')
    })
  })

  describe('OT decontamination', () => {
    it('never treats Open Targets disease.molecules as drug names', () => {
      const contaminated: DiseaseResult = {
        id: 'EFO_0000249',
        name: 'Alzheimer disease',
        source: 'Open Targets',
        // These are target/protein names wrongly attached historically
        molecules: [
          { name: 'Amyloid-beta precursor protein', cid: null },
          { name: 'Presenilin-1', cid: null },
        ],
      }
      const { names, skippedOtTargetNames } = moleculeNamesFromDiseaseResult(contaminated)
      expect(skippedOtTargetNames).toBe(true)
      expect(names).toEqual([])
    })

    it('still allows non-OT disease molecules through', () => {
      const orphanet: DiseaseResult = {
        id: 'ORPHA:123',
        name: 'Some rare disease',
        source: 'Orphanet',
        molecules: [{ name: 'Some protein name', cid: null }],
      }
      const { names, skippedOtTargetNames } = moleculeNamesFromDiseaseResult(orphanet)
      expect(skippedOtTargetNames).toBe(false)
      expect(names).toEqual(['Some protein name'])
    })
  })

  describe('normalizeLog / matchIndication (re-exported pure helpers)', () => {
    it('normalizeLog caps at 1', () => {
      expect(normalizeLog(200, 100)).toBeCloseTo(1, 5)
      expect(normalizeLog(0, 10)).toBe(0)
    })

    it('matchIndication returns best phase', () => {
      expect(
        matchIndication('neuropathic pain', [
          { meshHeading: 'Pain', efoTerm: '', maxPhaseForIndication: 2 },
          { meshHeading: 'Neuropathic Pain', efoTerm: 'Neuropathic pain', maxPhaseForIndication: 3 },
        ]),
      ).toBe(3)
    })
  })

  describe('CandidateMolecule / ConfidenceLevel shape', () => {
    it('has all required fields', () => {
      expect(GOLDEN_CANDIDATE.name).toBe('Donepezil')
      expect(typeof GOLDEN_CANDIDATE.compositeScore).toBe('number')
      const conf: ConfidenceLevel = GOLDEN_CANDIDATE.confidence
      expect(conf).toBe('high')
    })
  })
})
