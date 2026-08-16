import { getDrugPricesByName } from '@/lib/api/nadac'
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

describe('getDrugPricesByName', () => {
  test('returns parsed drug prices on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            ndc: '0002-3227-30',
            ndc_description: 'ASPIRIN 325 MG TABLET',
            nadac_per_unit: '0.0123',
            effective_date: '2025-01-01',
            pharmacy_type_code: 'RETAIL',
            pricing_unit: 'EA',
          },
        ],
      }),
    )
    const results = await getDrugPricesByName('Aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].ndcCode).toBe('0002-3227-30')
    expect(results[0].ndcDescription).toBe('ASPIRIN 325 MG TABLET')
    expect(results[0].nadacPerUnit).toBe(0.0123)
    expect(results[0].effectiveDate).toBe('2025-01-01')
    expect(results[0].pharmacyType).toBe('RETAIL')
    expect(results[0].pricingUnit).toBe('EA')
    expect(results[0].url).toContain('f38d0706-1239-442c-a3cc-40ef1b686ac0')
  })

  test('short query is empty (not fetched)', async () => {
    expect(await getDrugPricesByName('A')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getDrugPricesByName('unknownxyz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getDrugPricesByName('aspirin')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getDrugPricesByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getDrugPricesByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getDrugPricesByName('aspirin')).rejects.toThrow(/network/)
  })
})

describe('NADAC trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('nadac', getDrugPricesByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'nadac')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('nadac', getDrugPricesByName('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'nadac')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
