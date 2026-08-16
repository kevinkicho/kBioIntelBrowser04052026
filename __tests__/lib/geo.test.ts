import { searchGEO, getGEOSeries } from '@/lib/api/geo'
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

describe('searchGEO', () => {
  test('returns parsed datasets on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['200012345'] } }))
      .mockResolvedValueOnce(
        jsonRes({
          result: {
            '200012345': {
              accession: 'GSE12345',
              title: 'Aspirin expression study',
              summary: 'GEO series',
              organism: 'Homo sapiens',
              platformtype: 'Expression',
              sampletype: 'RNA',
              seriestype: 'Expression profiling',
              nsamples: '12',
              nfeatures: '20000',
              releasedate: '2020-01-01',
              lastupdate: '2020-02-01',
            },
          },
        }),
      )
    const results = await searchGEO('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].accession).toBe('GSE12345')
    expect(results[0].title).toBe('Aspirin expression study')
    expect(results[0].organism).toBe('Homo sapiens')
    expect(results[0].nSamples).toBe(12)
    expect(results[0].url).toBe('https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE12345')
  })

  test('empty query is empty (not fetched)', async () => {
    expect(await searchGEO('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('zero-hit idlist is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: [] } }))
    expect(await searchGEO('unknownxyz')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchGEO('unknownxyz')).toEqual([])
  })

  test('throws on search HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchGEO('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on summary HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['200012345'] } }))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchGEO('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchGEO('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchGEO('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getGEOSeries', () => {
  test('missing accession is empty (not fetched)', async () => {
    expect(await getGEOSeries('')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGEOSeries('GSE12345')).rejects.toThrow(/HTTP 503/)
  })
})

describe('GEO trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('geo', searchGEO('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'geo')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('geo', searchGEO('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'geo')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
