import { searchBioModels, getBioModelsModel } from '@/lib/api/biomodels'
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

describe('searchBioModels', () => {
  test('returns parsed models on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        models: [
          {
            id: 'BIOMD0000000001',
            name: 'Edelstein1996',
            description: 'A nicotinic model',
            authors: ['Edelstein'],
            submitter: 'Nicolas Le Novere',
            submitterDate: '2005-01-01',
            lastUpdate: '2012-01-01',
            modelSize: 12,
            formats: ['SBML'],
            organisms: ['Homo sapiens'],
          },
        ],
        total: 1,
      }),
    )
    const res = await searchBioModels('nicotinic')
    expect(res.models).toHaveLength(1)
    expect(res.models[0].id).toBe('BIOMD0000000001')
    expect(res.models[0].name).toBe('Edelstein1996')
    expect(res.models[0].url).toBe('https://www.biomodels.org/BIOMD0000000001')
    expect(res.total).toBe(1)
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ models: [], total: 0 }))
    expect(await searchBioModels('unknownxyz')).toEqual({ models: [], total: 0 })
  })

  test('blank query is empty without fetch', async () => {
    expect(await searchBioModels('  ')).toEqual({ models: [], total: 0 })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchBioModels('nicotinic')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchBioModels('nicotinic')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(searchBioModels('nicotinic')).rejects.toThrow(/HTML/)
  })
})

describe('getBioModelsModel honesty', () => {
  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 500))
    await expect(getBioModelsModel('BIOMD0000000001')).rejects.toThrow(/HTTP 500/)
  })

  test('blank id is null without fetch', async () => {
    expect(await getBioModelsModel('  ')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('BioModels trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('biomodels', searchBioModels('nicotinic'), { models: [], total: 0 }),
    )
    expect(value).toEqual({ models: [], total: 0 })
    const bm = metrics.find((m) => m.source === 'biomodels')
    expect(bm?.loadStatus).toBe('error')
    expect(bm?.error).toMatch(/HTTP 503/)
    expect(bm?.has_data).toBe(false)
  })

  test('true zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ models: [], total: 0 }))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('biomodels', searchBioModels('unknownxyz'), { models: [], total: 0 }),
    )
    expect(value).toEqual({ models: [], total: 0 })
    const bm = metrics.find((m) => m.source === 'biomodels')
    expect(bm?.loadStatus).not.toBe('error')
    expect(bm?.loadStatus).not.toBe('timeout')
    expect(bm?.error).toBeUndefined()
  })
})
