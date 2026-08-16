/**
 * @jest-environment node
 */

import { searchCATHDomains } from '../cath'
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

describe('searchCATHDomains', () => {
  it('returns empty for short query without network', async () => {
    await expect(searchCATHDomains('a')).resolves.toEqual([])
    await expect(searchCATHDomains('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps CATH domain search response', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        data: [
          {
            domain_id: '1cukA00',
            superfamily_id: '3.20.20.80',
            fold: 'TIM barrel',
            superfamily: 'Glycosidases',
            protein: 'lysozyme',
            organism: 'Gallus gallus',
            pdb_id: '1cuk',
            length: 129,
          },
        ],
      }),
    )
    const rows = await searchCATHDomains('lysozyme', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].domainId).toBe('1cukA00')
    expect(rows[0].superfamily).toBe('Glycosidases')
    expect(rows[0].url).toContain('1cukA00')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('cathdb.info')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: [] }))
    expect(await searchCATHDomains('unknownxyzcath')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchCATHDomains('lysozyme')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchCATHDomains('lysozyme')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchCATHDomains('lysozyme')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchCATHDomains('lysozyme')).rejects.toThrow(/network/)
  })
})

describe('CATH trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('cath', searchCATHDomains('lysozyme'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'cath')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('cath', searchCATHDomains('lysozyme'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'cath')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
