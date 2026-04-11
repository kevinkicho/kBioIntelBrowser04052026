import { getClinVarVariantsByName } from '@/lib/api/clinvar'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getClinVarVariantsByName', () => {
  test('returns parsed variants on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ esearchresult: { idlist: ['12345'] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            '12345': {
              title: 'NM_000044.6(AR):c.2596G>A (p.Val866Met)',
              clinical_significance: {
                description: 'Pathogenic',
                review_status: 'criteria provided, single submitter',
              },
              genes: [{ symbol: 'AR' }],
              trait_set: [{ trait_name: 'Androgen insensitivity syndrome' }],
            },
          },
        }),
      })
    const results = await getClinVarVariantsByName('AR')
    expect(results).toHaveLength(1)
    expect(results[0].variantId).toBe('12345')
    expect(results[0].title).toBe('NM_000044.6(AR):c.2596G>A (p.Val866Met)')
    expect(results[0].clinicalSignificance).toBe('Pathogenic')
    expect(results[0].geneSymbol).toBe('AR')
    expect(results[0].conditionName).toBe('Androgen insensitivity syndrome')
    expect(results[0].reviewStatus).toBe('criteria provided, single submitter')
    expect(results[0].url).toBe('https://www.ncbi.nlm.nih.gov/clinvar/variation/12345/')
  })

  test('returns empty array when no IDs found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ esearchresult: { idlist: [] } }),
    })
    expect(await getClinVarVariantsByName('unknownxyz')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('returns empty array when search returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getClinVarVariantsByName('AR')).toEqual([])
  })

  test('returns empty array when summary returns non-ok', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ esearchresult: { idlist: ['12345'] } }),
      })
      .mockResolvedValueOnce({ ok: false })
    expect(await getClinVarVariantsByName('AR')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getClinVarVariantsByName('AR')).toEqual([])
  })

  test('handles missing genes and trait_set gracefully', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ esearchresult: { idlist: ['99999'] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            '99999': {
              title: 'Some variant',
              clinical_significance: { description: 'Uncertain significance', review_status: 'no assertion criteria provided' },
              genes: [],
              trait_set: [],
            },
          },
        }),
      })
    const results = await getClinVarVariantsByName('test')
    expect(results).toHaveLength(1)
    expect(results[0].geneSymbol).toBe('')
    expect(results[0].conditionName).toBe('')
  })
})
