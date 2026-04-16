import { getGwasAssociationsByName } from '@/lib/api/gwas-catalog'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

// The source flow:
// 1. searchTraits(name) -> hits SEARCH_URL returning { response: { docs: [...] } }
// 2. For each trait, fetchAssociationsByEfo or fetchStudiesByDiseaseTrait
// 3. If no results, fallback to fetchStudiesByDiseaseTrait(name)

function mockSearchTraitsResponse(traits: { trait: string; efoUri: string }[]) {
  return {
    ok: true,
    json: async () => ({
      response: {
        docs: traits.map(t => ({
          resourcename: 'trait',
          mappedTrait: t.trait,
          mappedUri: [t.efoUri],
        })),
      },
    }),
  }
}

function mockEfoAssociationsResponse(associations: Record<string, unknown>[]) {
  return {
    ok: true,
    json: async () => ({
      _embedded: { associations },
    }),
  }
}

function mockDiseaseTraitStudiesResponse(studies: Record<string, unknown>[]) {
  return {
    ok: true,
    json: async () => ({
      _embedded: { studies },
    }),
  }
}

describe('getGwasAssociationsByName', () => {
  test('returns parsed associations via EFO trait lookup', async () => {
    ;(fetch as jest.Mock)
      // 1. searchTraits
      .mockResolvedValueOnce(mockSearchTraitsResponse([
        { trait: 'Type 2 Diabetes', efoUri: 'http://www.ebi.ac.uk/efo/EFO_0001360' },
      ]))
      // 2. fetchAssociationsByEfo
      .mockResolvedValueOnce(mockEfoAssociationsResponse([
        {
          pvalue: 1.5e-8,
          loci: [{
            strongestRiskAlleles: [{ riskAlleleName: 'rs123-A' }],
            authorReportedGenes: [{ geneName: 'TCF7L2' }],
          }],
          accessionId: 'GCST001234',
        },
      ]))

    const results = await getGwasAssociationsByName('diabetes')
    expect(results).toHaveLength(1)
    expect(results[0].traitName).toBe('Type 2 Diabetes')
    expect(results[0].pValue).toBe(1.5e-8)
    expect(results[0].riskAllele).toBe('rs123-A')
    expect(results[0].studyId).toBe('GCST001234')
  })

  test('falls back to disease trait search when EFO returns no results', async () => {
    ;(fetch as jest.Mock)
      // 1. searchTraits returns a trait with EFO URI
      .mockResolvedValueOnce(mockSearchTraitsResponse([
        { trait: 'Test Trait', efoUri: 'http://www.ebi.ac.uk/efo/EFO_0000001' },
      ]))
      // 2. fetchAssociationsByEfo returns empty
      .mockResolvedValueOnce(mockEfoAssociationsResponse([]))
      // 3. fetchStudiesByDiseaseTrait
      .mockResolvedValueOnce(mockDiseaseTraitStudiesResponse([
        {
          diseaseTrait: { trait: 'Test Trait' },
          pvalue: 1e-5,
          strongestSnpRiskAlleles: [{ riskAlleleName: 'rs456-T' }],
          chromosomeName: '1q23',
          accessionId: 'GCST005678',
        },
      ]))

    const results = await getGwasAssociationsByName('test')
    expect(results).toHaveLength(1)
    expect(results[0].traitName).toBe('Test Trait')
  })

  test('falls back to direct disease trait search when searchTraits fails', async () => {
    ;(fetch as jest.Mock)
      // 1. searchTraits fails
      .mockResolvedValueOnce({ ok: false })
      // 2. final fallback: fetchStudiesByDiseaseTrait(name)
      .mockResolvedValueOnce(mockDiseaseTraitStudiesResponse([
        {
          diseaseTrait: { trait: 'Aspirin Response' },
          pvalue: 1e-6,
          strongestSnpRiskAlleles: [{ riskAlleleName: 'rs789-G' }],
          chromosomeName: '2q24',
          accessionId: 'GCST009999',
        },
      ]))

    const results = await getGwasAssociationsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].traitName).toBe('Aspirin Response')
  })

  test('returns empty array when all endpoints fail', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false })
    expect(await getGwasAssociationsByName('aspirin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getGwasAssociationsByName('aspirin')).toEqual([])
  })
})
