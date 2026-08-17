/**
 * @jest-environment node
 */

import { searchDrugShortages, getAllDrugShortages } from '../fda-drug-shortages'
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

describe('searchDrugShortages', () => {
  it('returns empty for blank query without network', async () => {
    await expect(searchDrugShortages('')).resolves.toEqual({ shortages: [], total: 0 })
    await expect(searchDrugShortages('   ')).resolves.toEqual({ shortages: [], total: 0 })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps openFDA shortage rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      results: [{
        id: 's1',
        drug_name: 'Aspirin',
        generic_name: 'aspirin',
        company: 'Acme',
        shortage_status: 'Shortage',
        shortage_type: 'Current',
        reason_for_shortage: 'Demand',
        estimated_resupply_date: '2026-09-01',
      }],
      meta: { results: { total: 1 } },
    }))
    const result = await searchDrugShortages('aspirin')
    expect(result.shortages).toHaveLength(1)
    expect(result.shortages[0].drugName).toBe('Aspirin')
    expect(result.shortages[0].company).toBe('Acme')
    expect(result.total).toBe(1)
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [], meta: { results: { total: 0 } } }))
    expect(await searchDrugShortages('unknownxyz')).toEqual({ shortages: [], total: 0 })
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchDrugShortages('aspirin')).toEqual({ shortages: [], total: 0 })
  })

  it('throws when openFDA returns HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchDrugShortages('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchDrugShortages('aspirin')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchDrugShortages('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getAllDrugShortages', () => {
  it('throws on HTTP 503 (not empty-as-success)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getAllDrugShortages()).rejects.toThrow(/HTTP 503/)
  })
})

describe('FDA drug shortages trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('fda-drug-shortages', searchDrugShortages('aspirin'), { shortages: [], total: 0 }),
    )
    expect(value).toEqual({ shortages: [], total: 0 })
    const row = metrics.find((m) => m.source === 'fda-drug-shortages')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('fda-drug-shortages', searchDrugShortages('aspirin'), { shortages: [], total: 0 }),
    )
    expect(value).toEqual({ shortages: [], total: 0 })
    const row = metrics.find((m) => m.source === 'fda-drug-shortages')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})