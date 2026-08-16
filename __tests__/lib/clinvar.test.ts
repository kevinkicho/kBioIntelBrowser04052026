import { getClinVarVariantsByName, searchClinVar } from '@/lib/api/clinvar'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getClinVarVariantsByName', () => {
  test('returns parsed variants on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonRes({ esearchresult: { idlist: ['12345'] } }),
      )
      .mockResolvedValueOnce(
        jsonRes({
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
      )
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

  test('empty query is empty (not fetched)', async () => {
    expect(await getClinVarVariantsByName('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('zero-hit idlist is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: [] } }))
    expect(await getClinVarVariantsByName('unknownxyz')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getClinVarVariantsByName('unknownxyz')).toEqual([])
  })

  test('throws on search HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getClinVarVariantsByName('AR')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on summary HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['12345'] } }))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getClinVarVariantsByName('AR')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getClinVarVariantsByName('AR')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getClinVarVariantsByName('AR')).rejects.toThrow(/network/)
  })

  test('handles missing genes and trait_set gracefully', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['99999'] } }))
      .mockResolvedValueOnce(
        jsonRes({
          result: {
            '99999': {
              title: 'Some variant',
              clinical_significance: {
                description: 'Uncertain significance',
                review_status: 'no assertion criteria provided',
              },
              genes: [],
              trait_set: [],
            },
          },
        }),
      )
    const results = await getClinVarVariantsByName('test')
    expect(results).toHaveLength(1)
    expect(results[0].geneSymbol).toBe('')
    expect(results[0].conditionName).toBe('')
  })
})

describe('searchClinVar', () => {
  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchClinVar('BRCA1')).rejects.toThrow(/HTTP 503/)
  })

  test('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([0, [], []]))
    expect(await searchClinVar('zzz')).toEqual({ variants: [], total: 0 })
  })
})

describe('ClinVar trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('clinvar', getClinVarVariantsByName('AR'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'clinvar')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('clinvar', getClinVarVariantsByName('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'clinvar')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})