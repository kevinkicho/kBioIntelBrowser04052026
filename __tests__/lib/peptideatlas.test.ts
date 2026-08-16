jest.mock('@/lib/api/uniprot', () => ({
  getUniprotEntriesByName: jest.fn().mockResolvedValue([]),
}))

import { getPeptideAtlasData, getPeptidesByProtein, searchPeptides } from '@/lib/api/peptideatlas'
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

describe('searchPeptides', () => {
  test('returns mapped peptides on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        peptides: [
          {
            peptide_id: 'PAp0001',
            sequence: 'PEPTIDESEQ',
            proteins: 'P12345;Q9Y6K9',
            genes: 'TP53',
            organism: 'Homo sapiens',
            tissue: 'liver',
            sample_type: 'tissue',
            observations: 12,
            best_score: 0.9,
          },
        ],
      }),
    )
    const rows = await searchPeptides('TP53')
    expect(rows).toHaveLength(1)
    expect(rows[0].peptideId).toBe('PAp0001')
    expect(rows[0].sequence).toBe('PEPTIDESEQ')
    expect(rows[0].proteinNames).toEqual(['P12345', 'Q9Y6K9'])
    expect(rows[0].url).toContain('PAp0001')
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchPeptides('zzz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ peptides: [] }))
    expect(await searchPeptides('zzz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchPeptides('TP53')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchPeptides('TP53')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchPeptides('TP53')).rejects.toThrow(/network/)
  })
})

describe('getPeptidesByProtein', () => {
  test('legacy PeptideAtlas rows win without EBI', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({ peptides: [{ peptide_id: 'P1', sequence: 'ABCDEF', genes: 'TP53' }] }),
    )
    const rows = await getPeptidesByProtein('P04637')
    expect(rows).toHaveLength(1)
    expect(rows[0].proteinNames).toEqual(['P04637'])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('legacy 404 falls through to EBI zero-hit EMPTY', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes([]))
    expect(await getPeptidesByProtein('P04637')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('legacy 503 + EBI 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPeptidesByProtein('P04637')).rejects.toThrow(/HTTP 503/)
  })

  test('legacy 503 + EBI 404 throws primary (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 404))
    await expect(getPeptidesByProtein('P04637')).rejects.toThrow(/HTTP 503/)
  })
})

describe('getPeptideAtlasData', () => {
  test('search 503 throws (not EMPTY shell)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPeptideAtlasData('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('true empty search JSON is empty shell', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({ peptides: [] }))
    ;(getUniprotEntriesByName as jest.Mock).mockResolvedValue([])
    expect(await getPeptideAtlasData('unknownxyz')).toEqual({ peptides: [] })
  })
})

describe('PeptideAtlas trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('peptideatlas', searchPeptides('TP53'), []),
    )
    expect(value).toEqual([])
    const pa = metrics.find((m) => m.source === 'peptideatlas')
    expect(pa?.loadStatus).toBe('error')
    expect(pa?.error).toMatch(/HTTP 503/)
    expect(pa?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('peptideatlas', searchPeptides('zzz'), []),
    )
    expect(value).toEqual([])
    const pa = metrics.find((m) => m.source === 'peptideatlas')
    expect(pa?.loadStatus).not.toBe('error')
    expect(pa?.loadStatus).not.toBe('timeout')
    expect(pa?.error).toBeUndefined()
  })
})
