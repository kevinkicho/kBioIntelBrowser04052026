jest.mock('@/lib/api/uniprot', () => ({
  getUniprotEntriesByName: jest.fn().mockResolvedValue([]),
}))

import { getIEDBData, searchBEpitopes, searchEpitopes, searchTEpitopes } from '@/lib/api/iedb'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'

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

describe('searchEpitopes', () => {
  test('returns mapped epitopes on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            epitope_id: 42,
            epitope_name: 'ep1',
            epitope_sequence: 'SIINFEKL',
            antigen_name: 'OVA',
            source_organism: 'Mus musculus',
            assay_count: 3,
            positive_count: 2,
          },
        ],
      }),
    )
    const rows = await searchEpitopes('OVA')
    expect(rows).toHaveLength(1)
    expect(rows[0].epitopeId).toBe(42)
    expect(rows[0].sequence).toBe('SIINFEKL')
    expect(rows[0].url).toContain('42')
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchEpitopes('zzz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await searchEpitopes('zzz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchEpitopes('OVA')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchEpitopes('OVA')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchEpitopes('OVA')).rejects.toThrow(/network/)
  })
})

describe('searchBEpitopes / searchTEpitopes', () => {
  test('B-cell 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchBEpitopes('OVA')).rejects.toThrow(/HTTP 503/)
  })

  test('T-cell 404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchTEpitopes('zzz')).toEqual([])
  })
})

describe('getIEDBData', () => {
  test('IEDB rows win without EBI', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(
      jsonRes({ results: [{ epitope_id: 7, epitope_sequence: 'PEPTIDE' }] }),
    )
    const data = await getIEDBData('P04637')
    expect(data.epitopes).toHaveLength(1)
    expect(data.epitopes[0].epitopeId).toBe(7)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  test('IEDB 404 falls through to EBI zero-hit EMPTY', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes([]))
    expect(await getIEDBData('P04637')).toEqual({ epitopes: [] })
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  test('IEDB 503 + EBI 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getIEDBData('P04637')).rejects.toThrow(/HTTP 503/)
  })

  test('IEDB 503 + EBI 404 throws primary (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 404))
    await expect(getIEDBData('P04637')).rejects.toThrow(/HTTP 503/)
  })

  test('IEDB 503 + EBI rows uses fallback', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes([{ peptide: 'SIINFEKL', type: 'epitope', begin: 1, end: 8 }]))
    const data = await getIEDBData('P04637')
    expect(data.epitopes).toHaveLength(1)
    expect(data.epitopes[0].sequence).toBe('SIINFEKL')
    expect(data.epitopes[0].source).toMatch(/EBI/)
  })

  test('true empty search JSON is empty shell', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({ results: [] }))
    ;(getUniprotEntriesByName as jest.Mock).mockResolvedValue([])
    expect(await getIEDBData('unknownxyz')).toEqual({ epitopes: [] })
  })
})

describe('IEDB trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('iedb', getIEDBData('P04637'), { epitopes: [] }),
    )
    expect(value).toEqual({ epitopes: [] })
    const row = metrics.find((m) => m.source === 'iedb')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('iedb', getIEDBData('P04637'), { epitopes: [] }),
    )
    expect(value).toEqual({ epitopes: [] })
    const row = metrics.find((m) => m.source === 'iedb')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
