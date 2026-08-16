import { getNdcProductsByName } from '@/lib/api/fda-ndc'
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

describe('getNdcProductsByName', () => {
  test('returns parsed NDC products on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            product_ndc: '0002-3227',
            brand_name: 'PROZAC',
            generic_name: 'FLUOXETINE HYDROCHLORIDE',
            dosage_form: 'CAPSULE',
            route: ['ORAL'],
            marketing_category: 'NDA',
            labeler_name: 'Eli Lilly and Company',
            product_type: 'HUMAN PRESCRIPTION DRUG',
            openfda: {
              pharm_class_epc: ['Serotonin Reuptake Inhibitor [EPC]'],
            },
          },
        ],
      }),
    )
    const results = await getNdcProductsByName('fluoxetine')
    expect(results).toHaveLength(1)
    expect(results[0].productNdc).toBe('0002-3227')
    expect(results[0].brandName).toBe('PROZAC')
    expect(results[0].genericName).toBe('FLUOXETINE HYDROCHLORIDE')
    expect(results[0].dosageForm).toBe('CAPSULE')
    expect(results[0].route).toBe('ORAL')
    expect(results[0].marketingCategory).toBe('NDA')
    expect(results[0].labelerName).toBe('Eli Lilly and Company')
    expect(results[0].productType).toBe('HUMAN PRESCRIPTION DRUG')
    expect(results[0].pharmClass).toEqual(['Serotonin Reuptake Inhibitor [EPC]'])
    expect(results[0].url).toContain('0002-3227')
    expect(results[0].url).toContain('api.fda.gov/drug/ndc.json')
    expect(results[0].url).toContain('product_ndc')
  })

  test('joins multiple routes', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            product_ndc: '0001-0001',
            route: ['ORAL', 'INTRAVENOUS'],
          },
        ],
      }),
    )
    const results = await getNdcProductsByName('test')
    expect(results[0].route).toBe('ORAL, INTRAVENOUS')
  })

  test('404 is honest EMPTY (openFDA no matches)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ error: { code: 'NOT_FOUND' } }, 404))
    expect(await getNdcProductsByName('unknownxyz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    expect(await getNdcProductsByName('aspirin')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getNdcProductsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getNdcProductsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getNdcProductsByName('aspirin')).rejects.toThrow(/network/)
  })
})

describe('FDA NDC trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('fda-ndc', getNdcProductsByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'fda-ndc')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('fda-ndc', getNdcProductsByName('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'fda-ndc')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
