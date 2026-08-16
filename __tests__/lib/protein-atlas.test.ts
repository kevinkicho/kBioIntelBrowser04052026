import { getProteinAtlasBySymbols } from '@/lib/api/protein-atlas'
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

describe('getProteinAtlasBySymbols', () => {
  test('returns parsed entries on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes([
        {
          Gene: 'ACE',
          Uniprot: ['P12821'],
          'Subcellular location': ['Cytoplasm', 'Cell membrane'],
        },
        { Gene: 'OTHER', Uniprot: ['Q00000'], 'Subcellular location': [] },
      ]),
    )
    const results = await getProteinAtlasBySymbols(['ACE'])
    expect(results).toHaveLength(1)
    expect(results[0].gene).toBe('ACE')
    expect(results[0].uniprotId).toBe('P12821')
    expect(results[0].subcellularLocations).toEqual(['Cytoplasm', 'Cell membrane'])
    expect(results[0].url).toBe('https://www.proteinatlas.org/ACE')
  })

  test('empty symbols is empty (not fetched)', async () => {
    expect(await getProteinAtlasBySymbols([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('unmatched JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([{ Gene: 'OTHER', Uniprot: ['Q00000'], 'Subcellular location': [] }]))
    expect(await getProteinAtlasBySymbols(['ACE'])).toEqual([])
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getProteinAtlasBySymbols(['ACE'])).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getProteinAtlasBySymbols(['ACE'])).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getProteinAtlasBySymbols(['ACE'])).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getProteinAtlasBySymbols(['ACE'])).rejects.toThrow(/network/)
  })

  test('limits to first 5 symbols', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(
      jsonRes([{ Gene: 'X', Uniprot: ['U1'], 'Subcellular location': [] }]),
    )
    await getProteinAtlasBySymbols(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  test('deduplicates entries by gene', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes([{ Gene: 'ACE', Uniprot: ['P12821'], 'Subcellular location': [] }]))
      .mockResolvedValueOnce(jsonRes([{ Gene: 'ACE', Uniprot: ['P12821'], 'Subcellular location': [] }]))
    const results = await getProteinAtlasBySymbols(['ACE', 'ACE'])
    expect(results).toHaveLength(1)
  })
})

describe('Protein Atlas trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('protein-atlas', getProteinAtlasBySymbols(['ACE']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'protein-atlas')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('protein-atlas', getProteinAtlasBySymbols(['ACE']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'protein-atlas')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
