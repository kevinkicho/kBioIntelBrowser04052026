/**
 * @jest-environment node
 */

import { getDrugsByIngredient } from '../openfda'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

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
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

describe('getDrugsByIngredient', () => {
  it('returns empty for blank query without network', async () => {
    await expect(getDrugsByIngredient('')).resolves.toEqual([])
    await expect(getDrugsByIngredient('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps openFDA label manufacturers', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      results: [{
        openfda: {
          manufacturer_name: ['Novo Nordisk'],
          brand_name: ['Victoza'],
          generic_name: ['LIRAGLUTIDE'],
          product_type: ['HUMAN PRESCRIPTION DRUG'],
          route: ['SUBCUTANEOUS'],
          application_number: ['NDA022341'],
        },
      }],
    }))
    const rows = await getDrugsByIngredient('liraglutide')
    expect(rows).toHaveLength(1)
    expect(rows[0].company).toBe('Novo Nordisk')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('api.fda.gov')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getDrugsByIngredient('unknownxyzfda')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getDrugsByIngredient('xyznotadrug')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getDrugsByIngredient('liraglutide')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getDrugsByIngredient('liraglutide')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getDrugsByIngredient('insulin')).rejects.toThrow(/network/)
  })
})

describe('openFDA companies trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('openfda', getDrugsByIngredient('liraglutide'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'openfda')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('openfda', getDrugsByIngredient('xyznotadrug'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'openfda')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
