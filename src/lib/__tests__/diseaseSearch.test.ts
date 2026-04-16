import { rankDiseaseResults, parseLimit } from '@/lib/diseaseSearch'
import type { DiseaseResult } from '@/lib/diseaseSearch'
import * as opentargets from '@/lib/api/opentargets'
import * as orphanet from '@/lib/api/orphanet'
import * as disgenet from '@/lib/api/disgenet'
import * as pubchem from '@/lib/api/pubchem'

jest.mock('@/lib/api/opentargets')
jest.mock('@/lib/api/orphanet')
jest.mock('@/lib/api/disgenet')
jest.mock('@/lib/api/pubchem')

global.fetch = jest.fn()

describe('parseLimit', () => {
  test('returns 10 for null input', () => {
    expect(parseLimit(null)).toBe(10)
  })

  test('returns provided value when in range', () => {
    expect(parseLimit('15')).toBe(15)
    expect(parseLimit('3')).toBe(3)
  })

  test('defaults to 10 for non-numeric input', () => {
    expect(parseLimit('abc')).toBe(10)
  })

  test('returns 1 for "1"', () => {
    expect(parseLimit('1')).toBe(1)
  })

  test('defaults to 10 for zero', () => {
    expect(parseLimit('0')).toBe(10)
  })

  test('clamps negative to 1', () => {
    expect(parseLimit('-5')).toBe(1)
  })

  test('clamps to maximum of 25', () => {
    expect(parseLimit('100')).toBe(25)
    expect(parseLimit('30')).toBe(25)
  })
})

describe('rankDiseaseResults', () => {
  const makeResult = (name: string, source = 'Open Targets'): DiseaseResult => ({
    id: 'test-id',
    name,
    source,
  })

  test('ranks exact match first', () => {
    const results = [
      makeResult('Diabetes complications'),
      makeResult('Diabetes'),
      makeResult('Diabetic neuropathy'),
    ]
    const ranked = rankDiseaseResults(results, 'diabetes')
    expect(ranked[0].name).toBe('Diabetes')
  })

  test('ranks prefix matches above non-prefix', () => {
    const results = [
      makeResult('Type 2 diabetes'),
      makeResult('Diabetes mellitus'),
    ]
    const ranked = rankDiseaseResults(results, 'diabetes')
    expect(ranked[0].name).toBe('Diabetes mellitus')
  })

  test('handles case-insensitive matching', () => {
    const results = [
      makeResult('DIABETES'),
      makeResult('Diabetes'),
    ]
    const ranked = rankDiseaseResults(results, 'diabetes')
    expect(ranked[0].name).toBe('DIABETES')
    expect(ranked[1].name).toBe('Diabetes')
  })

  test('preserves original order for equal scores', () => {
    const results = [
      makeResult('Heart disease'),
      makeResult('Lung disease'),
    ]
    const ranked = rankDiseaseResults(results, 'diabetes')
    expect(ranked.map(r => r.name)).toEqual(['Heart disease', 'Lung disease'])
  })

  test('returns empty array for empty input', () => {
    expect(rankDiseaseResults([], 'query')).toEqual([])
  })
})

describe('searchDiseases integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('deduplicates diseases across sources by name', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    ;(opentargets.searchDiseases as jest.Mock).mockResolvedValue([
      { diseaseId: 'EFO_0001354', diseaseName: 'Diabetes', therapeuticAreas: [] },
    ])
    ;(opentargets.getDrugsForDisease as jest.Mock).mockResolvedValue([])
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockResolvedValue([
      { orphaCode: '999', diseaseName: 'Diabetes', definition: '', diseaseType: '', synonyms: [], genes: [], symptoms: [], prevalence: '', url: '' },
    ])
    ;(disgenet.getGenesByDisease as jest.Mock).mockResolvedValue([])

    const results = await searchDiseases('diabetes', 10)
    const diabetesResults = results.filter(r => r.name.toLowerCase() === 'diabetes')
    expect(diabetesResults).toHaveLength(1)
    expect(diabetesResults[0].source).toBe('Open Targets')
  })

  test('fetches DisGeNET diseases from gene associations', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    ;(opentargets.searchDiseases as jest.Mock).mockResolvedValue([])
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockResolvedValue([])
    ;(disgenet.getGenesByDisease as jest.Mock)
      .mockResolvedValueOnce([
        { geneSymbol: 'BRCA1', geneId: '672', diseaseId: 'C0029925', diseaseName: 'Breast Cancer', diseaseType: 'disease', score: 0.9, source: 'BEFREE', pmids: [] },
      ])
      .mockResolvedValueOnce([
        { geneSymbol: 'BRCA1', geneId: '672', diseaseId: 'C0029925', diseaseName: 'Breast Cancer', diseaseType: 'disease', score: 0.9, source: 'BEFREE', pmids: [] },
      ])
    ;(pubchem.getMoleculeCidByName as jest.Mock).mockResolvedValue(null)
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })

    const results = await searchDiseases('breast cancer', 10)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].name).toBe('Breast Cancer')
    expect(results[0].source).toBe('DisGeNET')
  })

  test('resolves molecules from drug names for Open Targets', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    ;(opentargets.searchDiseases as jest.Mock).mockResolvedValue([
      { diseaseId: 'EFO_0000311', diseaseName: 'Type 2 diabetes', therapeuticAreas: [] },
    ])
    ;(opentargets.getDrugsForDisease as jest.Mock).mockResolvedValue(['Metformin', 'Insulin'])
    ;(pubchem.getMoleculeCidByName as jest.Mock)
      .mockResolvedValueOnce(4048)
      .mockResolvedValueOnce(null)
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockResolvedValue([])
    ;(disgenet.getGenesByDisease as jest.Mock).mockResolvedValue([])

    const results = await searchDiseases('diabetes', 10)
    expect(results[0].molecules).toHaveLength(2)
    expect(results[0].molecules![0]).toEqual({ name: 'Metformin', cid: 4048 })
    expect(results[0].molecules![1]).toEqual({ name: 'Insulin', cid: null })
  })

  test('respects limit parameter', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    const diseases = Array.from({ length: 15 }, (_, i) => ({
      diseaseId: `EFO_${i}`,
      diseaseName: `Disease ${i}`,
      therapeuticAreas: [],
    }))
    ;(opentargets.searchDiseases as jest.Mock).mockResolvedValue(diseases)
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockResolvedValue([])
    ;(disgenet.getGenesByDisease as jest.Mock).mockResolvedValue([])

    const results = await searchDiseases('disease', 3)
    expect(results).toHaveLength(3)
  })

  test('returns empty array when all sources fail', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    ;(opentargets.searchDiseases as jest.Mock).mockRejectedValue(new Error('API down'))
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockRejectedValue(new Error('API down'))
    ;(disgenet.getGenesByDisease as jest.Mock).mockRejectedValue(new Error('API down'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const results = await searchDiseases('diabetes', 10)
    expect(results).toEqual([])
    consoleSpy.mockRestore()
  })

  test('includes molecules with null CID when PubChem lookup fails', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    ;(opentargets.searchDiseases as jest.Mock).mockResolvedValue([])
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockResolvedValue([])
    ;(disgenet.getGenesByDisease as jest.Mock)
      .mockResolvedValueOnce([
        { geneSymbol: 'TP53', geneId: '7157', diseaseId: 'C0032927', diseaseName: 'Pancreatic Cancer', diseaseType: 'disease', score: 0.8, source: 'BEFREE', pmids: [] },
      ])
      .mockResolvedValueOnce([
        { geneSymbol: 'TP53', geneId: '7157', diseaseId: 'C0032927', diseaseName: 'Pancreatic Cancer', diseaseType: 'disease', score: 0.8, source: 'BEFREE', pmids: [] },
      ])
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ proteinDescription: { recommendedName: { fullName: { value: 'Tumor protein p53' } } } }],
      }),
    })
    ;(pubchem.getMoleculeCidByName as jest.Mock).mockResolvedValue(null)

    const results = await searchDiseases('pancreatic cancer', 10)
    expect(results).toHaveLength(1)
    expect(results[0].molecules).toHaveLength(1)
    expect(results[0].molecules![0].cid).toBeNull()
    expect(results[0].molecules![0].name).toBe('Tumor protein p53')
  })

  test('uses gene symbol when UniProt request fails', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    ;(opentargets.searchDiseases as jest.Mock).mockResolvedValue([])
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockResolvedValue([
      { orphaCode: '999', diseaseName: 'Test Disease', definition: '', diseaseType: '', synonyms: [], genes: [], symptoms: [], prevalence: '', url: '' },
    ])
    ;(orphanet.getOrphanetGenes as jest.Mock).mockResolvedValue(['BRAF'])
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    ;(pubchem.getMoleculeCidByName as jest.Mock).mockResolvedValue(null)
    ;(disgenet.getGenesByDisease as jest.Mock).mockResolvedValue([])

    const results = await searchDiseases('test', 10)
    expect(results[0].molecules).toHaveLength(1)
    expect(results[0].molecules![0].name).toBe('BRAF')
    expect(results[0].molecules![0].cid).toBeNull()
  })

  test('caps search results at the given limit', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    const diseases = Array.from({ length: 30 }, (_, i) => ({
      diseaseId: `EFO_${i}`,
      diseaseName: `Disease ${i}`,
      therapeuticAreas: [],
    }))
    ;(opentargets.searchDiseases as jest.Mock).mockResolvedValue(diseases)
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockResolvedValue([])
    ;(disgenet.getGenesByDisease as jest.Mock).mockResolvedValue([])

    const results = await searchDiseases('disease', 25)
    expect(results).toHaveLength(25)
  })

  test('resolves molecules even when enrichment fails for one result', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    ;(opentargets.searchDiseases as jest.Mock).mockResolvedValue([
      { diseaseId: 'EFO_1', diseaseName: 'Working Disease', therapeuticAreas: [] },
      { diseaseId: 'EFO_2', diseaseName: 'Broken Disease', therapeuticAreas: [] },
    ])
    ;(opentargets.getDrugsForDisease as jest.Mock)
      .mockResolvedValueOnce(['Metformin'])
      .mockRejectedValueOnce(new Error('API error'))
    ;(pubchem.getMoleculeCidByName as jest.Mock).mockResolvedValue(4048)
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockResolvedValue([])
    ;(disgenet.getGenesByDisease as jest.Mock).mockResolvedValue([])

    const results = await searchDiseases('disease', 10)
    expect(results).toHaveLength(2)
    expect(results[0].name).toBe('Working Disease')
    expect(results[0].molecules).toBeDefined()
    expect(results[1].name).toBe('Broken Disease')
    expect(results[1].molecules).toBeUndefined()
  })

  test('skips diseases with empty names', async () => {
    const { searchDiseases } = await import('@/lib/diseaseSearch')
    ;(opentargets.searchDiseases as jest.Mock).mockResolvedValue([
      { diseaseId: 'EFO_X', diseaseName: undefined, therapeuticAreas: [] },
      { diseaseId: 'EFO_Y', diseaseName: '', therapeuticAreas: [] },
      { diseaseId: 'EFO_Z', diseaseName: 'Valid Disease', therapeuticAreas: [] },
    ])
    ;(orphanet.searchOrphanetDiseases as jest.Mock).mockResolvedValue([])
    ;(disgenet.getGenesByDisease as jest.Mock).mockResolvedValue([])

    const results = await searchDiseases('disease', 10)
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Valid Disease')
  })
})