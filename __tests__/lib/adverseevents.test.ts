import { getAdverseEventsByName } from '@/lib/api/adverseevents'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getAdverseEventsByName', () => {
  test('returns parsed adverse events on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      results: [
        {
          term: 'nausea',
          count: 1523,
          serious_count: 45,
          outcome: 'recovered/resolved',
        },
        {
          term: 'vomiting',
          count: 892,
          serious_count: 12,
          outcome: 'recovered/resolved',
        },
      ],
    }))
    const results = await getAdverseEventsByName('liraglutide')
    expect(results).toHaveLength(2)
    expect(results[0].reactionName).toBe('nausea')
    expect(results[0].count).toBe(1523)
    expect(results[0].serious).toBe(45)
    expect(results[0].outcome).toBe('recovered/resolved')
  })

  test('404 no-matches is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ error: { code: 'NOT_FOUND' } }, 404))
    const results = await getAdverseEventsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getAdverseEventsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getAdverseEventsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('returns empty array when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    const results = await getAdverseEventsByName('aspirin')
    expect(results).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getAdverseEventsByName('aspirin')).rejects.toThrow(/network/)
  })
})