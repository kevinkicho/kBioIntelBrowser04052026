/**
 * @jest-environment node
 */

import { getWikiPathwaysByName } from '../wikipathways'
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

describe('getWikiPathwaysByName', () => {
  it('returns empty for blank query without network', async () => {
    await expect(getWikiPathwaysByName('')).resolves.toEqual([])
    await expect(getWikiPathwaysByName('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps Pathway Commons WikiPathways hits', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      searchHit: [
        {
          uri: 'https://www.wikipathways.org/pathways/WP123',
          name: 'ACE Inhibitor Pathway',
        },
      ],
    }))
    const rows = await getWikiPathwaysByName('lisinopril')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('WP123')
    expect(rows[0].name).toBe('ACE Inhibitor Pathway')
    expect(rows[0].url).toBe('https://www.wikipathways.org/pathways/WP123')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('pathwaycommons.org')
  })

  it('PC 503 still uses Reactome fallback; Reactome 503 throws', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getWikiPathwaysByName('lisinopril')).rejects.toThrow(/HTTP 503/)
  })

  it('PC 503 then Reactome zero-hit is empty (not error)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getWikiPathwaysByName('unknownxyzwp')).toEqual([])
  })

  it('PC empty then Reactome pathways map', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ searchHit: [] }))
      .mockResolvedValueOnce(jsonRes({
        results: [{ entries: [{ stId: 'R-HSA-1', name: 'Signal Transduction' }] }],
      }))
    const rows = await getWikiPathwaysByName('lisinopril')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('R-HSA-1')
    expect(rows[0].url).toContain('R-HSA-1')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ searchHit: [] }))
      .mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getWikiPathwaysByName('unknownxyzwp')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    expect(await getWikiPathwaysByName('lisinopril')).toEqual([])
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getWikiPathwaysByName('lisinopril')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getWikiPathwaysByName('lisinopril')).rejects.toThrow(/network/)
  })
})

describe('WikiPathways trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('wikipathways', getWikiPathwaysByName('lisinopril'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'wikipathways')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('wikipathways', getWikiPathwaysByName('lisinopril'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'wikipathways')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
