/**
 * @jest-environment node
 */

import { searchBioSamples, getBioSample } from '../biosamples'
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

describe('searchBioSamples', () => {
  it('returns empty for blank query without network', async () => {
    await expect(searchBioSamples('')).resolves.toEqual({ samples: [], total: 0, page: 0, size: 20 })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps BioSamples search rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      _embedded: { sample: [{ id: 'SAMEA1', name: 'blood', domain: 'self', description: 'x' }] },
      page: { totalElements: 1, number: 0, size: 10 },
    }))
    const result = await searchBioSamples('aspirin', 0, 10)
    expect(result.samples).toHaveLength(1)
    expect(result.samples[0].id).toBe('SAMEA1')
    expect(result.total).toBe(1)
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      _embedded: { sample: [] },
      page: { totalElements: 0, number: 0, size: 10 },
    }))
    const result = await searchBioSamples('unknownxyz', 0, 10)
    expect(result.samples).toEqual([])
    expect(result.total).toBe(0)
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchBioSamples('aspirin', 0, 10)).toEqual({ samples: [], total: 0, page: 0, size: 10 })
  })

  it('throws when BioSamples returns HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchBioSamples('aspirin', 0, 10)).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchBioSamples('aspirin', 0, 10)).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchBioSamples('aspirin', 0, 10)).rejects.toThrow(/network/)
  })
})

describe('getBioSample', () => {
  it('throws on HTTP 503 (not null-as-empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getBioSample('SAMEA1')).rejects.toThrow(/HTTP 503/)
  })

  it('404 is null (true empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getBioSample('missing')).toBeNull()
  })
})

describe('BioSamples trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('biosamples', searchBioSamples('aspirin', 0, 10), { samples: [], total: 0, page: 0, size: 10 }),
    )
    expect(value).toEqual({ samples: [], total: 0, page: 0, size: 10 })
    const row = metrics.find((m) => m.source === 'biosamples')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('biosamples', searchBioSamples('aspirin', 0, 10), { samples: [], total: 0, page: 0, size: 10 }),
    )
    expect(value.samples).toEqual([])
    const row = metrics.find((m) => m.source === 'biosamples')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})