import { searchHPOTerms, getHPOTerm } from '@/lib/api/hpo'
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

describe('searchHPOTerms', () => {
  test('returns parsed terms on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes([
        1,
        ['HP:0001250'],
        [['HP:0001250', 'Seizure', 'A seizure', 'convulsion|fit']],
      ]),
    )
    const res = await searchHPOTerms('seizure')
    expect(res.terms).toHaveLength(1)
    expect(res.terms[0].id).toBe('HP:0001250')
    expect(res.terms[0].name).toBe('Seizure')
    expect(res.terms[0].definition).toBe('A seizure')
    expect(res.terms[0].synonyms).toEqual(['convulsion', 'fit'])
    expect(res.total).toBe(1)
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([0, [], []]))
    expect(await searchHPOTerms('unknownxyz')).toEqual({ terms: [], total: 0 })
  })

  test('blank query is empty without fetch', async () => {
    expect(await searchHPOTerms('  ')).toEqual({ terms: [], total: 0 })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchHPOTerms('seizure')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchHPOTerms('seizure')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(searchHPOTerms('seizure')).rejects.toThrow(/HTML/)
  })
})

describe('getHPOTerm honesty', () => {
  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 500))
    await expect(getHPOTerm('HP:0001250')).rejects.toThrow(/HTTP 500/)
  })

  test('blank id is null without fetch', async () => {
    expect(await getHPOTerm('  ')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('HPO trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('hpo', searchHPOTerms('seizure'), { terms: [], total: 0 }),
    )
    expect(value).toEqual({ terms: [], total: 0 })
    const hpo = metrics.find((m) => m.source === 'hpo')
    expect(hpo?.loadStatus).toBe('error')
    expect(hpo?.error).toMatch(/HTTP 503/)
    expect(hpo?.has_data).toBe(false)
  })

  test('true zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([0, [], []]))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('hpo', searchHPOTerms('unknownxyz'), { terms: [], total: 0 }),
    )
    expect(value).toEqual({ terms: [], total: 0 })
    const hpo = metrics.find((m) => m.source === 'hpo')
    expect(hpo?.loadStatus).not.toBe('error')
    expect(hpo?.loadStatus).not.toBe('timeout')
    expect(hpo?.error).toBeUndefined()
  })
})