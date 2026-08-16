import { getPdbStructuresByName } from '@/lib/api/pdb'
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

describe('getPdbStructuresByName', () => {
  test('returns parsed PDB structures on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        result_set: [
          { identifier: '1M17', score: 1.0 },
          { identifier: '4HJO', score: 0.9 },
        ],
      }),
    )
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        struct: { title: 'Crystal structure of EGFR with erlotinib' },
        rcsb_entry_info: {
          resolution_combined: [2.6],
          experimental_method: 'X-RAY DIFFRACTION',
        },
        rcsb_accession_info: { deposit_date: '2023-05-10' },
      }),
    )
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        struct: { title: 'EGFR kinase domain complex' },
        rcsb_entry_info: {
          resolution_combined: [1.8],
          experimental_method: 'X-RAY DIFFRACTION',
        },
        rcsb_accession_info: { deposit_date: '2022-11-01' },
      }),
    )
    const results = await getPdbStructuresByName('erlotinib')
    expect(results).toHaveLength(2)
    expect(results[0].pdbId).toBe('4HJO')
    expect(results[0].resolution).toBe(1.8)
    expect(results[1].pdbId).toBe('1M17')
    expect(results[1].title).toBe('Crystal structure of EGFR with erlotinib')
    expect(results[1].url).toBe('https://www.rcsb.org/structure/1M17')
  })

  test('empty query is empty (not fetched)', async () => {
    expect(await getPdbStructuresByName('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ result_set: [] }))
    expect(await getPdbStructuresByName('unknownxyz')).toEqual([])
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getPdbStructuresByName('unknownxyz')).toEqual([])
  })

  test('throws on search HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPdbStructuresByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getPdbStructuresByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getPdbStructuresByName('aspirin')).rejects.toThrow(/network/)
  })

  test('throws when all entry fetches fail with HTTP 503', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ result_set: [{ identifier: '1M17' }] }))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPdbStructuresByName('erlotinib')).rejects.toThrow(/HTTP 503/)
  })

  test('entry 404 is skipped (missing id stays empty-success if none remain)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ result_set: [{ identifier: '1M17' }] }))
      .mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getPdbStructuresByName('erlotinib')).toEqual([])
  })
})

describe('PDB trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pdb', getPdbStructuresByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'pdb')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('pdb', getPdbStructuresByName('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'pdb')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})