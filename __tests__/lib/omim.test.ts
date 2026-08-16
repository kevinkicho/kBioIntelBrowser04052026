import { searchOMIM, getOMIMData, getOMIMEntry } from '@/lib/api/omim'
import { getApiKey } from '@/lib/api/utils'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

jest.mock('@/lib/api/utils', () => ({
  getApiKey: jest.fn(() => 'test-omim-key'),
}))

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
beforeEach(() => {
  jest.resetAllMocks()
  ;(getApiKey as jest.Mock).mockReturnValue('test-omim-key')
})

describe('searchOMIM', () => {
  test('returns parsed entries on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        omim: {
          searchResponse: {
            entryList: [
              {
                mimNumber: 601367,
                prefix: '#',
                status: 'live',
                entry: { titles: 'Aspirin sensitivity;;NSAID hypersensitivity' },
              },
            ],
          },
        },
      }),
    )
    const results = await searchOMIM('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].mimNumber).toBe(601367)
    expect(results[0].name).toBe('Aspirin sensitivity')
    expect(results[0].url).toBe('https://omim.org/entry/601367')
  })

  test('missing key is empty (not fetched)', async () => {
    ;(getApiKey as jest.Mock).mockReturnValue('')
    expect(await searchOMIM('aspirin')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchOMIM('unknownxyz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ omim: { searchResponse: { entryList: [] } } }))
    expect(await searchOMIM('aspirin')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchOMIM('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchOMIM('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchOMIM('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getOMIMEntry', () => {
  test('404 missing id is null (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getOMIMEntry(999999)).toBeNull()
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getOMIMEntry(601367)).rejects.toThrow(/HTTP 503/)
  })
})

describe('getOMIMData', () => {
  test('wraps search entries', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        omim: {
          searchResponse: {
            entryList: [{ mimNumber: 1, prefix: '#', status: 'live', entry: { titles: 'Foo' } }],
          },
        },
      }),
    )
    const data = await getOMIMData('foo')
    expect(data.entries).toHaveLength(1)
    expect(data.entries[0].name).toBe('Foo')
  })
})

describe('OMIM trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('omim', getOMIMData('aspirin'), { entries: [] }),
    )
    expect(value).toEqual({ entries: [] })
    const row = metrics.find((m) => m.source === 'omim')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('omim', getOMIMData('zzz'), { entries: [] }),
    )
    expect(value).toEqual({ entries: [] })
    const row = metrics.find((m) => m.source === 'omim')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
