import { getProteinFeaturesByAccessions } from '@/lib/api/ebi-proteins'
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

describe('getProteinFeaturesByAccessions', () => {
  test('returns parsed features on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        features: [
          {
            type: 'ACTIVE_SITE',
            description: 'Zinc-binding',
            begin: '361',
            end: '361',
          },
          {
            type: 'CHAIN',
            description: 'Full-length chain',
            begin: '1',
            end: '1306',
          },
        ],
      }),
    )
    const results = await getProteinFeaturesByAccessions(['P12821'])
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('ACTIVE_SITE')
    expect(results[0].description).toBe('Zinc-binding')
    expect(results[0].start).toBe(361)
    expect(results[0].end).toBe(361)
    expect(results[0].url).toBe('https://www.uniprot.org/uniprot/P12821#ACTIVE_SITE')
  })

  test('empty accessions is empty (not fetched)', async () => {
    expect(await getProteinFeaturesByAccessions([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ features: [] }))
    expect(await getProteinFeaturesByAccessions(['P12821'])).toEqual([])
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getProteinFeaturesByAccessions(['P12821'])).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getProteinFeaturesByAccessions(['P12821'])).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getProteinFeaturesByAccessions(['P12821'])).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getProteinFeaturesByAccessions(['P12821'])).rejects.toThrow(/network/)
  })

  test('limits to first 3 accessions', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(
      jsonRes({ features: [{ type: 'BINDING', description: '', begin: '1', end: '2' }] }),
    )
    await getProteinFeaturesByAccessions(['A1', 'A2', 'A3', 'A4', 'A5'])
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  test('limits total features to 15', async () => {
    const manyFeatures = Array.from({ length: 20 }, (_, i) => ({
      type: 'BINDING',
      description: `Feature ${i}`,
      begin: String(i),
      end: String(i + 1),
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ features: manyFeatures }))
    const results = await getProteinFeaturesByAccessions(['P12821'])
    expect(results).toHaveLength(15)
  })
})

describe('EBI Proteins trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ebi-proteins', getProteinFeaturesByAccessions(['P12821']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'ebi-proteins')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ebi-proteins', getProteinFeaturesByAccessions(['P12821']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'ebi-proteins')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
