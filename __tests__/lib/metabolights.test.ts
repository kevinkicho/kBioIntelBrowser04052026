import { searchMetaboLights, searchMetaboLightsMetabolites, getMetaboLightsStudy } from '@/lib/api/metabolights'
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

describe('searchMetaboLights', () => {
  test('returns mapped studies on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        studies: [
          {
            accession: 'MTBLS1',
            title: 'Aspirin metabolomics',
            studyType: 'Metabolomics',
          },
        ],
      }),
    )
    const rows = await searchMetaboLights('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('MTBLS1')
    expect(rows[0].title).toBe('Aspirin metabolomics')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('404 + EBI zero-hit is honest EMPTY', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes({ entries: [] }))
    expect(await searchMetaboLights('zzz')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('true empty JSON + EBI empty is empty (not error)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ studies: [] }))
      .mockResolvedValueOnce(jsonRes({ entries: [] }))
    expect(await searchMetaboLights('zzz')).toEqual([])
  })

  test('WS 503 + EBI 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchMetaboLights('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('WS 503 + EBI 404 throws primary (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 404))
    await expect(searchMetaboLights('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('WS 503 + EBI rows uses fallback', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(
        jsonRes({
          entries: [
            {
              id: 'MTBLS9',
              fields: { title: 'EBI fallback study' },
            },
          ],
        }),
      )
    const rows = await searchMetaboLights('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('MTBLS9')
    expect(rows[0].title).toBe('EBI fallback study')
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchMetaboLights('aspirin')).rejects.toThrow(/HTML|HTTP 503/)
  })

  test('throws on network error when fallback also fails', async () => {
    ;(fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
    await expect(searchMetaboLights('aspirin')).rejects.toThrow(/network/)
  })
})

describe('searchMetaboLightsMetabolites / getMetaboLightsStudy', () => {
  test('metabolites 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchMetaboLightsMetabolites('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('study 404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getMetaboLightsStudy('MTBLS999')).toBeNull()
  })

  test('missing id is EMPTY', async () => {
    expect(await getMetaboLightsStudy('')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('MetaboLights trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('metabolights', searchMetaboLights('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'metabolights')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('metabolights', searchMetaboLights('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'metabolights')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})