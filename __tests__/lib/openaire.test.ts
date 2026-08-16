import {
  getOpenAireProjectsByName,
  getOpenAirePublicationsByName,
  getEuResearchProjectsByName,
} from '@/lib/api/openaire'
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

function projectBody(title = 'Test amyloidosis project') {
  return {
    response: {
      results: {
        result: {
          header: { 'dri:objIdentifier': { $: 'proj-1' } },
          metadata: {
            'oaf:entity': {
              'oaf:project': {
                code: { $: '101000000' },
                title: { $: title },
                acronym: { $: 'TAP' },
                startdate: { $: '2020-01-01' },
                enddate: { $: '2024-12-31' },
                fundedamount: { $: '1000000' },
                totalcost: { $: '1200000' },
                fundingtree: {
                  funder: {
                    shortname: { $: 'EC' },
                    name: { $: 'European Commission' },
                    jurisdiction: { $: 'EU' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getOpenAireProjectsByName', () => {
  test('short query is EMPTY without fetch', async () => {
    expect(await getOpenAireProjectsByName('a')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('returns mapped projects on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(projectBody()))
    const rows = await getOpenAireProjectsByName('amyloidosis')
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toMatch(/amyloidosis/i)
    expect(rows[0].code).toBe('101000000')
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getOpenAireProjectsByName('zzz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ response: { results: {} } }))
    expect(await getOpenAireProjectsByName('zzz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getOpenAireProjectsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getOpenAireProjectsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getOpenAireProjectsByName('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getOpenAirePublicationsByName', () => {
  test('publications 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getOpenAirePublicationsByName('tafamidis')).rejects.toThrow(/HTTP 503/)
  })

  test('publications 404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getOpenAirePublicationsByName('zzz')).toEqual([])
  })
})

describe('getEuResearchProjectsByName', () => {
  test('EC rows win without general search', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(projectBody('EC only')))
    const rows = await getEuResearchProjectsByName('amyloidosis')
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('EC only')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('EC 503 + general 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getEuResearchProjectsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('EC 503 + general 404 throws primary (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 404))
    await expect(getEuResearchProjectsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('EC 503 + general rows uses fallback', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes(projectBody('General fallback')))
    const rows = await getEuResearchProjectsByName('amyloidosis')
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('General fallback')
  })

  test('EC empty + general empty is EMPTY', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ response: { results: {} } }))
      .mockResolvedValueOnce(jsonRes({ response: { results: {} } }))
    expect(await getEuResearchProjectsByName('zzz')).toEqual([])
  })
})

describe('OpenAIRE trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('openaire', getEuResearchProjectsByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'openaire')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('openaire', getEuResearchProjectsByName('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'openaire')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})