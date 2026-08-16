/**
 * @jest-environment node
 */

import { searchCPICGuidelines, getCPICData } from '../cpic'
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

describe('searchCPICGuidelines', () => {
  it('returns empty for short query without network', async () => {
    await expect(searchCPICGuidelines('a')).resolves.toEqual([])
    await expect(searchCPICGuidelines('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps CPIC guideline search response', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            id: 'cpic-1',
            drugName: 'warfarin',
            drugClass: 'anticoagulant',
            gene: 'CYP2C9',
            guidelineId: 'G1',
            lastUpdated: '2024-01-01',
            recommendations: [{ phenotype: 'PM', recommendation: 'reduce dose', strength: 'strong' }],
          },
        ],
      }),
    )
    const rows = await searchCPICGuidelines('warfarin', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].drugName).toBe('warfarin')
    expect(rows[0].gene).toBe('CYP2C9')
    expect(rows[0].recommendations).toHaveLength(1)
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('api.cpicpgx.org')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await searchCPICGuidelines('unknownxyzcpic')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchCPICGuidelines('warfarin')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchCPICGuidelines('warfarin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchCPICGuidelines('warfarin')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchCPICGuidelines('warfarin')).rejects.toThrow(/network/)
  })
})

describe('getCPICData same-source fallback', () => {
  it('falls back to recommendations on true empty guidelines', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ results: [] }))
      .mockResolvedValueOnce(
        jsonRes({
          results: [
            {
              drugName: 'warfarin',
              gene: 'VKORC1',
              guidelineId: 'G2',
              phenotype: 'high sensitivity',
              recommendation: 'use lower dose',
            },
          ],
        }),
      )
    const rows = await getCPICData('warfarin')
    expect(rows).toHaveLength(1)
    expect(rows[0].gene).toBe('VKORC1')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws when guidelines 503 (does not swallow as empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getCPICData('warfarin')).rejects.toThrow(/HTTP 503/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throws when fallback recommendations also fail', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ results: [] }))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getCPICData('warfarin')).rejects.toThrow(/HTTP 503/)
  })
})

describe('CPIC trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('cpic', searchCPICGuidelines('warfarin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'cpic')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('cpic', searchCPICGuidelines('warfarin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'cpic')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})