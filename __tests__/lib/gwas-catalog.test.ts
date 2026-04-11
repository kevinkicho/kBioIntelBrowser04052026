import { getGwasAssociationsByName, getGwasAssociationsByTrait } from '@/lib/api/gwas-catalog'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getGwasAssociationsByName', () => {
  test('returns parsed associations on success', async () => {
    // Mock the EFO trait endpoint
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _embedded: {
          studies: [
            {
              diseaseTrait: { trait: 'Type 2 Diabetes' },
              pvalue: 1.5e-8,
              strongestSnpRiskAlleles: [{ riskAlleleName: 'rs123-A' }],
              chromosomeName: '6p21',
              accessionId: 'GCST001234',
            },
          ],
        },
      }),
    })
    const results = await getGwasAssociationsByName('diabetes')
    expect(results).toHaveLength(1)
    expect(results[0].traitName).toBe('Type 2 Diabetes')
    expect(results[0].pValue).toBe(1.5e-8)
    expect(results[0].riskAllele).toBe('rs123-A')
    expect(results[0].region).toBe('6p21')
    expect(results[0].studyId).toBe('GCST001234')
    expect(results[0].url).toContain('diabetes')
  })

  test('uses fallback when EFO trait endpoint fails', async () => {
    // First call fails (EFO endpoint)
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false })
      // Second call succeeds (fallback disease trait endpoint)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _embedded: {
            studies: [
              {
                diseaseTrait: { trait: 'Test Trait' },
                pvalue: 1e-5,
                strongestSnpRiskAlleles: [{ riskAlleleName: 'rs456-T' }],
                chromosomeName: '1q23',
                accessionId: 'GCST005678',
              },
            ],
          },
        }),
      })
    
    const results = await getGwasAssociationsByName('test')
    expect(results).toHaveLength(1)
    expect(results[0].traitName).toBe('Test Trait')
    expect(fetch).toHaveBeenCalledTimes(2) // Should try both endpoints
  })

  test('uses Number() coercion and falls back to defaults', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _embedded: {
          studies: [
            {
              diseaseTrait: null,
              pvalue: null,
              strongestSnpRiskAlleles: [],
              chromosomeName: null,
              accessionId: null,
            },
          ],
        },
      }),
    })
    const results = await getGwasAssociationsByName('test')
    expect(results[0].traitName).toBe('test') // Falls back to original query
    expect(results[0].pValue).toBe(0)
    expect(results[0].riskAllele).toBe('')
    expect(results[0].region).toBe('')
  })

  test('encodes query parameter', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _embedded: { studies: [] } }),
    })
    await getGwasAssociationsByName('breast cancer')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('breast%20cancer')
  })

  test('returns empty array when fetch returns non-ok', async () => {
    // Both EFO and fallback endpoints fail
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

describe('getGwasAssociationsByTrait', () => {
  test('searches by EFO trait URI', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _embedded: {
          studies: [
            {
              diseaseTrait: { trait: 'Diabetes Mellitus' },
              pvalue: 1e-10,
              strongestSnpRiskAlleles: [{ riskAlleleName: 'rs789-G' }],
              chromosomeName: '2q24',
              accessionId: 'GCST009999',
            },
          ],
        },
      }),
    })
    
    const traitUri = 'http://www.ebi.ac.uk/efo/EFO_0000400'
    const results = await getGwasAssociationsByTrait(traitUri)
    expect(results).toHaveLength(1)
    expect(results[0].traitName).toBe('Diabetes Mellitus')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('efoTrait=' + encodeURIComponent(traitUri)),
      expect.any(Object)
    )
  })
})
