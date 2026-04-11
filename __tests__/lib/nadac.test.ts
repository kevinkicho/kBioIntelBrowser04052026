import { getDrugPricesByName } from '@/lib/api/nadac'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getDrugPricesByName', () => {
  test('returns parsed drug prices on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          ndc_description: 'ASPIRIN 325 MG TABLET',
          nadac_per_unit: '0.0123',
          effective_date: '2025-01-01',
          pharmacy_type_code: 'RETAIL',
          pricing_unit: 'EA',
        },
      ]),
    })
    const results = await getDrugPricesByName('Aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].ndcDescription).toBe('ASPIRIN 325 MG TABLET')
    expect(results[0].nadacPerUnit).toBe(0.0123)
    expect(results[0].effectiveDate).toBe('2025-01-01')
    expect(results[0].pharmacyType).toBe('RETAIL')
    expect(results[0].pricingUnit).toBe('EA')
    expect(results[0].url).toBe('https://data.medicaid.gov/dataset/nadac')
  })

  test('uses Number() coercion and falls back to 0 for nadac_per_unit', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          ndc_description: 'ASPIRIN 81 MG',
          nadac_per_unit: null,
          effective_date: '2025-01-01',
          pharmacy_type_code: 'RETAIL',
          pricing_unit: 'EA',
        },
      ]),
    })
    const results = await getDrugPricesByName('Aspirin')
    expect(results[0].nadacPerUnit).toBe(0)
  })

  test('defaults pharmacy_type_code to RETAIL when missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          ndc_description: 'ASPIRIN 500 MG',
          nadac_per_unit: '0.05',
          effective_date: '2025-02-01',
          pharmacy_type_code: '',
          pricing_unit: 'EA',
        },
      ]),
    })
    const results = await getDrugPricesByName('Aspirin')
    expect(results[0].pharmacyType).toBe('RETAIL')
  })

  test('includes 2-year recency filter in the fetch URL', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    await getDrugPricesByName('Aspirin')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('effective_date')
  })

  test('returns empty array when fetch returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getDrugPricesByName('Aspirin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getDrugPricesByName('Aspirin')).toEqual([])
  })

  test('returns empty array when API returns empty list', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    expect(await getDrugPricesByName('unknownxyz')).toEqual([])
  })
})
