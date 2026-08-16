/**
 * @jest-environment node
 */

import { searchSAbDab } from '../sabdab'
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

describe('searchSAbDab', () => {
  it('returns empty for short query without network', async () => {
    await expect(searchSAbDab('a')).resolves.toEqual([])
    await expect(searchSAbDab('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps SAbDab search response', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            pdb: '1a2y',
            resolution: 1.8,
            species: 'Homo sapiens',
            antigen: 'lysozyme',
            antibody_type: 'Fab',
            heavy_chain: 'H',
            light_chain: 'L',
          },
        ],
      }),
    )
    const rows = await searchSAbDab('lysozyme', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].pdbId).toBe('1a2y')
    expect(rows[0].antigen).toBe('lysozyme')
    expect(rows[0].antibodyType).toBe('Fab')
    expect(rows[0].url).toContain('1a2y')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('opig.stats.ox.ac.uk')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await searchSAbDab('unknownxyzsabdab')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchSAbDab('lysozyme')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchSAbDab('lysozyme')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchSAbDab('lysozyme')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchSAbDab('lysozyme')).rejects.toThrow(/network/)
  })
})

describe('SAbDab trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('sabdab', searchSAbDab('lysozyme'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'sabdab')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('sabdab', searchSAbDab('lysozyme'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'sabdab')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
