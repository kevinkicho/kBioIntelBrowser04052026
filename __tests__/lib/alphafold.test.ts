import { getAlphaFoldPredictions } from '@/lib/api/alphafold'
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

describe('getAlphaFoldPredictions', () => {
  test('returns parsed predictions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes([
        {
          entryId: 'AF-P12821-F1',
          uniprotAccession: 'P12821',
          gene: 'ACE',
          organismScientificName: 'Homo sapiens',
          paeOverallScore: 92.5,
          cifUrl: 'https://alphafold.ebi.ac.uk/files/AF-P12821-F1-model_v4.cif',
        },
      ]),
    )
    const results = await getAlphaFoldPredictions(['P12821'])
    expect(results).toHaveLength(1)
    expect(results[0].entryId).toBe('AF-P12821-F1')
    expect(results[0].uniprotAccession).toBe('P12821')
    expect(results[0].geneName).toBe('ACE')
    expect(results[0].organismName).toBe('Homo sapiens')
    expect(results[0].confidenceScore).toBe(92.5)
    expect(results[0].modelUrl).toBe('https://alphafold.ebi.ac.uk/files/AF-P12821-F1-model_v4.cif')
    expect(results[0].url).toBe('https://alphafold.ebi.ac.uk/entry/P12821')
  })

  test('falls back to globalMetricValue when paeOverallScore missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes([
        {
          entryId: 'AF-Q9Y5Y4-F1',
          uniprotAccession: 'Q9Y5Y4',
          gene: '',
          organismScientificName: 'Homo sapiens',
          globalMetricValue: 78.3,
          cifUrl: '',
        },
      ]),
    )
    const results = await getAlphaFoldPredictions(['Q9Y5Y4'])
    expect(results[0].confidenceScore).toBe(78.3)
  })

  test('limits to first 5 accessions', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(
      jsonRes([{ entryId: 'x', uniprotAccession: 'x', gene: '', organismScientificName: '', paeOverallScore: 0, cifUrl: '' }]),
    )
    await getAlphaFoldPredictions(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  test('empty accessions is empty (not fetched)', async () => {
    expect(await getAlphaFoldPredictions([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('404 is honest EMPTY for that accession', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(
        jsonRes([
          {
            entryId: 'AF-Q9Y5Y4-F1',
            uniprotAccession: 'Q9Y5Y4',
            gene: 'GENE2',
            organismScientificName: 'Homo sapiens',
            paeOverallScore: 85,
            cifUrl: '',
          },
        ]),
      )
    const results = await getAlphaFoldPredictions(['P12821', 'Q9Y5Y4'])
    expect(results).toHaveLength(1)
    expect(results[0].uniprotAccession).toBe('Q9Y5Y4')
  })

  test('empty prediction JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([]))
    expect(await getAlphaFoldPredictions(['P12821'])).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getAlphaFoldPredictions(['P12821'])).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getAlphaFoldPredictions(['P12821'])).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getAlphaFoldPredictions(['P12821'])).rejects.toThrow(/network/)
  })
})

describe('AlphaFold trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('alphafold', getAlphaFoldPredictions(['P12821']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'alphafold')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('alphafold', getAlphaFoldPredictions(['P12821']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'alphafold')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
