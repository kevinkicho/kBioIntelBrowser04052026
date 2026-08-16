import { searchLipidMaps, searchLipidsByFormula, getLipidsByCategory } from '@/lib/api/lipidmaps'
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

describe('searchLipidMaps', () => {
  test('returns mapped lipids on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            LM_ID: 'LMFA01010001',
            SYSTEMATIC_NAME: 'hexadecanoic acid',
            COMMON_NAME: 'palmitic acid',
            CATEGORY: 'Fatty Acyls',
            MAIN_CLASS: 'Fatty Acids',
            FORMULA: 'C16H32O2',
            MOLECULAR_WEIGHT: '256.42',
            EXACT_MASS: '256.2402',
          },
        ],
        total: 1,
      }),
    )
    const result = await searchLipidMaps('palmitic')
    expect(result.lipids).toHaveLength(1)
    expect(result.lipids[0].lmId).toBe('LMFA01010001')
    expect(result.lipids[0].name).toBe('hexadecanoic acid')
    expect(result.total).toBe(1)
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchLipidMaps('zzz')).toEqual({ lipids: [], total: 0 })
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [], total: 0 }))
    expect(await searchLipidMaps('zzz')).toEqual({ lipids: [], total: 0 })
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchLipidMaps('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchLipidMaps('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchLipidMaps('aspirin')).rejects.toThrow(/network/)
  })
})

describe('searchLipidsByFormula / getLipidsByCategory', () => {
  test('formula 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchLipidsByFormula('C16H32O2')).rejects.toThrow(/HTTP 503/)
  })

  test('category 404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getLipidsByCategory('zzz')).toEqual([])
  })
})

describe('LIPID MAPS trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('lipidmaps', searchLipidMaps('aspirin'), { lipids: [], total: 0 }),
    )
    expect(value).toEqual({ lipids: [], total: 0 })
    const row = metrics.find((m) => m.source === 'lipidmaps')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('lipidmaps', searchLipidMaps('zzz'), { lipids: [], total: 0 }),
    )
    expect(value).toEqual({ lipids: [], total: 0 })
    const row = metrics.find((m) => m.source === 'lipidmaps')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})