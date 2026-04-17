import { buildTherapeuticLandscape } from '@/lib/therapeuticLandscape'
import type { ChemblIndication, DiseaseAssociation, DisGeNetAssociation, OrphanetDisease, CTDDiseaseAssociation } from '@/lib/types'

function makeIndication(overrides: Partial<ChemblIndication> = {}): ChemblIndication {
  return {
    indicationId: '1',
    moleculeName: 'Test',
    condition: 'Alzheimer\'s Disease',
    maxPhase: 4,
    maxPhaseForIndication: 4,
    meshId: 'D000544',
    meshHeading: 'Alzheimer Disease',
    efoId: '',
    efoTerm: '',
    url: '',
    ...overrides,
  }
}

function makeOTDisease(overrides: Partial<DiseaseAssociation> = {}): DiseaseAssociation {
  return {
    diseaseId: 'EFO_0000249',
    diseaseName: 'Alzheimer\'s disease',
    score: 0.95,
    evidenceCount: 42,
    sources: ['Open Targets'],
    therapeuticAreas: ['neurology'],
    ...overrides,
  }
}

function makeDisGeNET(overrides: Partial<DisGeNetAssociation> = {}): DisGeNetAssociation {
  return {
    geneSymbol: 'APOE',
    geneId: '348',
    diseaseId: 'C0002395',
    diseaseName: 'Alzheimer\'s Disease',
    diseaseType: 'disease',
    score: 0.8,
    source: 'BEFREE',
    pmids: [],
    ...overrides,
  }
}

function makeOrphanet(overrides: Partial<OrphanetDisease> = {}): OrphanetDisease {
  return {
    orphaCode: '1020',
    diseaseName: 'Alzheimer disease',
    diseaseType: 'disease',
    definition: '',
    synonyms: [],
    genes: ['APOE'],
    symptoms: [],
    prevalence: '',
    url: '',
    ...overrides,
  }
}

function makeCTDDisease(overrides: Partial<CTDDiseaseAssociation> = {}): CTDDiseaseAssociation {
  return {
    diseaseName: 'Alzheimer Disease',
    diseaseId: 'C0002395',
    geneSymbol: 'MAPT',
    geneId: '4137',
    inferenceScore: 0.7,
    pmids: [],
    source: 'CTD',
    ...overrides,
  }
}

describe('buildTherapeuticLandscape', () => {
  it('returns empty landscape for null inputs', () => {
    const result = buildTherapeuticLandscape(null, null, null, null, null)
    expect(result.approved).toEqual([])
    expect(result.investigational).toEqual([])
    expect(result.repurposingCandidates).toEqual([])
    expect(result.totalDiseases).toBe(0)
  })

  it('returns empty landscape for empty arrays', () => {
    const result = buildTherapeuticLandscape([], [], [], [], [])
    expect(result.totalDiseases).toBe(0)
  })

  it('classifies ChEMBL phase 4 indications as approved', () => {
    const result = buildTherapeuticLandscape(
      [makeIndication({ meshHeading: 'Hypertension', maxPhaseForIndication: 4, condition: 'Hypertension' })],
      null, null, null, null,
    )
    expect(result.approved).toHaveLength(1)
    expect(result.approved[0].name).toBe('Hypertension')
    expect(result.approved[0].status).toBe('approved')
    expect(result.approved[0].phase).toBe(4)
    expect(result.approved[0].sources).toContain('ChEMBL')
  })

  it('classifies ChEMBL phase < 4 indications as investigational', () => {
    const result = buildTherapeuticLandscape(
      [makeIndication({ meshHeading: 'Cancer', maxPhaseForIndication: 2, condition: 'Cancer' })],
      null, null, null, null,
    )
    expect(result.investigational).toHaveLength(1)
    expect(result.investigational[0].status).toBe('investigational')
    expect(result.investigational[0].phase).toBe(2)
  })

  it('classifies diseases not in ChEMBL as repurposing candidates', () => {
    const result = buildTherapeuticLandscape(
      null,
      [makeOTDisease({ diseaseName: 'Migraine', score: 0.6 })],
      null, null, null,
    )
    expect(result.repurposingCandidates).toHaveLength(1)
    expect(result.repurposingCandidates[0].status).toBe('repurposing_candidate')
    expect(result.repurposingCandidates[0].sources).toContain('Open Targets')
  })

  it('deduplicates same disease across sources', () => {
    const result = buildTherapeuticLandscape(
      null,
      [makeOTDisease({ diseaseName: 'Alzheimer\'s disease' })],
      [makeDisGeNET({ diseaseName: 'Alzheimer\'s Disease' })],
      [makeOrphanet({ diseaseName: 'Alzheimer disease' })],
      [makeCTDDisease({ diseaseName: 'Alzheimer Disease' })],
    )
    expect(result.repurposingCandidates).toHaveLength(1)
    const disease = result.repurposingCandidates[0]
    expect(disease.sources).toContain('Open Targets')
    expect(disease.sources).toContain('DisGeNET')
    expect(disease.sources).toContain('Orphanet')
    expect(disease.sources).toContain('CTD')
  })

  it('handles fuzzy name matching — apostrophe and word order variants', () => {
    const result = buildTherapeuticLandscape(
      null,
      [makeOTDisease({ diseaseName: "Crohn's disease" })],
      [makeDisGeNET({ diseaseName: 'Crohn disease' })],
      null, null,
    )
    expect(result.repurposingCandidates).toHaveLength(1)
  })

  it('does not match completely different diseases', () => {
    const result = buildTherapeuticLandscape(
      null,
      [makeOTDisease({ diseaseName: 'Diabetes' })],
      [makeDisGeNET({ diseaseName: 'Hypertension' })],
      null, null,
    )
    expect(result.repurposingCandidates).toHaveLength(2)
  })

  it('merges gene symbols from DisGeNET, Orphanet, CTD', () => {
    const result = buildTherapeuticLandscape(
      null,
      [makeOTDisease({ diseaseName: 'Alzheimer\'s disease' })],
      [makeDisGeNET({ diseaseName: 'Alzheimer\'s Disease', geneSymbol: 'APOE' })],
      [makeOrphanet({ diseaseName: 'Alzheimer disease', genes: ['TREM2'] })],
      [makeCTDDisease({ diseaseName: 'Alzheimer Disease', geneSymbol: 'MAPT' })],
    )
    const disease = result.repurposingCandidates[0]
    expect(disease.geneSymbols).toContain('APOE')
    expect(disease.geneSymbols).toContain('TREM2')
    expect(disease.geneSymbols).toContain('MAPT')
  })

  it('merges therapeutic areas from Open Targets', () => {
    const result = buildTherapeuticLandscape(
      null,
      [makeOTDisease({ diseaseName: 'Diabetes', therapeuticAreas: ['metabolic', 'endocrine'] })],
      null, null, null,
    )
    expect(result.repurposingCandidates[0].therapeuticAreas).toContain('metabolic')
    expect(result.repurposingCandidates[0].therapeuticAreas).toContain('endocrine')
  })

  it('computes max score across sources', () => {
    const result = buildTherapeuticLandscape(
      null,
      [makeOTDisease({ diseaseName: 'Test Disease', score: 0.5 })],
      [makeDisGeNET({ diseaseName: 'Test Disease', score: 0.9 })],
      null, null,
    )
    expect(result.repurposingCandidates[0].score).toBe(0.9)
  })

  it('sorts approved by phase desc then score', () => {
    const result = buildTherapeuticLandscape(
      [
        makeIndication({ meshHeading: 'Hypertension', maxPhaseForIndication: 4, condition: 'Hypertension' }),
        makeIndication({ meshHeading: 'Diabetes', maxPhaseForIndication: 4, condition: 'Diabetes' }),
      ],
      null, null, null, null,
    )
    expect(result.approved).toHaveLength(2)
  })

  it('sorts repurposing candidates by score desc', () => {
    const result = buildTherapeuticLandscape(
      null,
      [
        makeOTDisease({ diseaseName: 'Migraine', score: 0.3 }),
        makeOTDisease({ diseaseName: 'Epilepsy', score: 0.9 }),
      ],
      null, null, null,
    )
    expect(result.repurposingCandidates[0].name).toBe('Epilepsy')
    expect(result.repurposingCandidates[1].name).toBe('Migraine')
  })

  it('cross-references ChEMBL indication with OT disease — matched disease is not a repurposing candidate', () => {
    const result = buildTherapeuticLandscape(
      [makeIndication({ meshHeading: 'Alzheimer Disease', maxPhaseForIndication: 4, condition: 'Alzheimer Disease' })],
      [makeOTDisease({ diseaseName: 'Alzheimer\'s disease', score: 0.95 })],
      null, null, null,
    )
    expect(result.approved).toHaveLength(1)
    expect(result.repurposingCandidates).toHaveLength(0)
  })

  it('preserves diseaseId and orphaCode', () => {
    const result = buildTherapeuticLandscape(
      null,
      [makeOTDisease({ diseaseName: 'Rare X', diseaseId: 'EFO_123' })],
      null,
      [makeOrphanet({ diseaseName: 'Rare X', orphaCode: '999' })],
      null,
    )
    const disease = result.repurposingCandidates[0]
    expect(disease.diseaseId).toBe('EFO_123')
    expect(disease.orphaCode).toBe('999')
  })

  it('counts total diseases correctly', () => {
    const result = buildTherapeuticLandscape(
      [makeIndication({ meshHeading: 'Approved One', maxPhaseForIndication: 4, condition: 'Approved One' })],
      [makeOTDisease({ diseaseName: 'Not Indicated', score: 0.5 })],
      null, null, null,
    )
    expect(result.totalDiseases).toBe(2)
  })

  it('handles null individual sources while others are present', () => {
    const result = buildTherapeuticLandscape(
      null,
      [makeOTDisease({ diseaseName: 'Diabetes' })],
      null,
      undefined as unknown as OrphanetDisease[],
      null,
    )
    expect(result.repurposingCandidates).toHaveLength(1)
  })

  describe('short disease name edge cases', () => {
    it('does not merge AML and CML — different abbreviations', () => {
      const result = buildTherapeuticLandscape(
        null,
        [makeOTDisease({ diseaseName: 'AML', score: 0.8 })],
        [makeDisGeNET({ diseaseName: 'CML', score: 0.7 })],
        null, null,
      )
      expect(result.repurposingCandidates).toHaveLength(2)
    })

    it('deduplicates identical short names', () => {
      const result = buildTherapeuticLandscape(
        null,
        [makeOTDisease({ diseaseName: 'AML', score: 0.8 })],
        [makeDisGeNET({ diseaseName: 'AML', score: 0.7 })],
        null, null,
      )
      expect(result.repurposingCandidates).toHaveLength(1)
      expect(result.repurposingCandidates[0].sources).toContain('Open Targets')
      expect(result.repurposingCandidates[0].sources).toContain('DisGeNET')
    })

    it('does not merge short abbreviations with full names unless contained', () => {
      const result = buildTherapeuticLandscape(
        null,
        [makeOTDisease({ diseaseName: 'AML', score: 0.8 })],
        [makeDisGeNET({ diseaseName: 'Acute Myeloid Leukemia', score: 0.9 })],
        null, null,
      )
      expect(result.repurposingCandidates).toHaveLength(2)
    })
  })

  describe('substring matching', () => {
    it('matches "Breast Cancer" and "Breast Cancer Type 2" as related — merges them', () => {
      const result = buildTherapeuticLandscape(
        null,
        [makeOTDisease({ diseaseName: 'Breast Cancer', score: 0.9 })],
        [makeDisGeNET({ diseaseName: 'Breast Cancer Type 2', score: 0.7 })],
        null, null,
      )
      expect(result.repurposingCandidates).toHaveLength(1)
      expect(result.repurposingCandidates[0].sources).toHaveLength(2)
    })

    it('does not match "Liver Cancer" and "Lung Cancer" — different diseases', () => {
      const result = buildTherapeuticLandscape(
        null,
        [makeOTDisease({ diseaseName: 'Liver Cancer', score: 0.8 })],
        [makeDisGeNET({ diseaseName: 'Lung Cancer', score: 0.9 })],
        null, null,
      )
      expect(result.repurposingCandidates).toHaveLength(2)
    })

    it('matches "Diabetes" and "Diabetes Mellitus" via substring containment', () => {
      const result = buildTherapeuticLandscape(
        null,
        [makeOTDisease({ diseaseName: 'Diabetes', score: 0.5 })],
        [makeDisGeNET({ diseaseName: 'Diabetes Mellitus', score: 0.7 })],
        null, null,
      )
      expect(result.repurposingCandidates).toHaveLength(1)
    })
  })

  describe('Levenshtein threshold boundary', () => {
    it('does not merge "CML" and "AML" — 1-char difference in 3-letter name', () => {
      const result = buildTherapeuticLandscape(
        null,
        [makeOTDisease({ diseaseName: 'CML', score: 0.8 })],
        [makeDisGeNET({ diseaseName: 'AML', score: 0.7 })],
        null, null,
      )
      expect(result.repurposingCandidates).toHaveLength(2)
    })

    it('merges approximate spellings within Levenshtein tolerance', () => {
      const result = buildTherapeuticLandscape(
        null,
        [makeOTDisease({ diseaseName: 'Sclerosis', score: 0.8 })],
        [makeDisGeNET({ diseaseName: 'Scleroses', score: 0.7 })],
        null, null,
      )
      expect(result.repurposingCandidates).toHaveLength(1)
    })

    it('does not merge 4-letter diseases with 1-char difference', () => {
      const result = buildTherapeuticLandscape(
        null,
        [makeOTDisease({ diseaseName: 'Gout', score: 0.8 })],
        [makeDisGeNET({ diseaseName: 'Gout', score: 0.7 })],
        null, null,
      )
      expect(result.repurposingCandidates).toHaveLength(1)
    })
  })
})