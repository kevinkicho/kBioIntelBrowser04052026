/**
 * @jest-environment node
 */

import { searchPharmGKBDrug, getPharmGKBData } from '../pharmgkb'
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

describe('searchPharmGKBDrug', () => {
  it('returns empty for blank query without network', async () => {
    await expect(searchPharmGKBDrug('')).resolves.toEqual([])
    await expect(searchPharmGKBDrug('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps PharmGKB drug search response', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      data: [
        {
          id: 'PA450428',
          name: 'warfarin',
          genericNames: ['warfarin'],
          brandNames: ['Coumadin'],
          drugClass: 'anticoagulant',
          genes: [{ geneSymbol: 'CYP2C9', geneId: 'PA126', interactionType: 'substrate', level: 'Level 1A' }],
          guidelines: [],
        },
      ],
    }))
    const rows = await searchPharmGKBDrug('warfarin', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('PA450428')
    expect(rows[0].name).toBe('warfarin')
    expect(rows[0].url).toContain('PA450428')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('pharmgkb.org')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: [] }))
    expect(await searchPharmGKBDrug('unknownxyzpgkb')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchPharmGKBDrug('warfarin')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchPharmGKBDrug('warfarin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchPharmGKBDrug('warfarin')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchPharmGKBDrug('warfarin')).rejects.toThrow(/network/)
  })
})

describe('getPharmGKBData', () => {
  it('throws on HTTP 503 (not empty shell)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPharmGKBData('warfarin')).rejects.toThrow(/HTTP 503/)
  })

  it('true empty stays empty shell', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: [] }))
    expect(await getPharmGKBData('unknownxyzpgkb')).toEqual({
      drugs: [],
      genes: [],
      guidelines: [],
    })
  })
})

describe('PharmGKB trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pharmgkb', searchPharmGKBDrug('warfarin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'pharmgkb')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pharmgkb', searchPharmGKBDrug('warfarin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'pharmgkb')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
