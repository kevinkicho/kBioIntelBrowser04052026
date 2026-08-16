/**
 * @jest-environment node
 */

import { searchGNPSLibrary, searchGNPSNetworks } from '../gnps'
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

describe('searchGNPSLibrary', () => {
  it('returns empty for short query without network', async () => {
    await expect(searchGNPSLibrary('a')).resolves.toEqual([])
    await expect(searchGNPSLibrary('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps GNPS library search response', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            spectrum_id: 'CCMSLIB00000001547',
            Compound_Name: 'Aspirin',
            Precursor_MZ: 181.05,
            Parent_Mass: 180.16,
            Ion_Mode: 'positive',
            SMILES: 'CC(=O)Oc1ccccc1C(=O)O',
            Library_Name: 'GNPS',
          },
        ],
      }),
    )
    const rows = await searchGNPSLibrary('aspirin', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('CCMSLIB00000001547')
    expect(rows[0].name).toBe('Aspirin')
    expect(rows[0].url).toContain('CCMSLIB00000001547')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('gnps.ucsd.edu')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await searchGNPSLibrary('unknownxyzgnps')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchGNPSLibrary('aspirin')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchGNPSLibrary('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchGNPSLibrary('aspirin')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchGNPSLibrary('aspirin')).rejects.toThrow(/network/)
  })
})

describe('searchGNPSNetworks', () => {
  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchGNPSNetworks('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await searchGNPSNetworks('unknownxyzgnps')).toEqual([])
  })
})

describe('GNPS trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('gnps', searchGNPSLibrary('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'gnps')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('gnps', searchGNPSLibrary('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'gnps')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
