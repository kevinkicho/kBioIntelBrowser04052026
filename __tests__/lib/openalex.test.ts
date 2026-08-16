import { getOpenAlexWorksByName } from '@/lib/api/openalex'

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

describe('getOpenAlexWorksByName', () => {
  test('returns parsed works on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      results: [
        {
          id: 'https://openalex.org/W123',
          title: 'Effects of Aspirin',
          publication_year: 2023,
          cited_by_count: 42,
          best_oa_location: { pdf_url: 'https://example.com/paper.pdf', landing_page_url: 'https://example.com' },
          type: 'article',
          doi: '10.1234/test',
        },
      ],
    }))
    const results = await getOpenAlexWorksByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].workId).toBe('https://openalex.org/W123')
    expect(results[0].title).toBe('Effects of Aspirin')
    expect(results[0].year).toBe(2023)
    expect(results[0].citationCount).toBe(42)
    expect(results[0].openAccessUrl).toBe('https://example.com/paper.pdf')
    expect(results[0].type).toBe('article')
  })

  test('uses Number() coercion and falls back to defaults', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      results: [
        {
          id: 'https://openalex.org/W456',
          title: 'Test',
          publication_year: null,
          cited_by_count: null,
          best_oa_location: null,
          type: '',
          doi: null,
        },
      ],
    }))
    const results = await getOpenAlexWorksByName('test')
    expect(results[0].year).toBe(0)
    expect(results[0].citationCount).toBe(0)
    expect(results[0].openAccessUrl).toBe('')
  })

  test('falls back to landing_page_url when pdf_url is null', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      results: [
        {
          id: 'https://openalex.org/W789',
          title: 'Test2',
          publication_year: 2022,
          cited_by_count: 5,
          best_oa_location: { pdf_url: null, landing_page_url: 'https://example.com/landing' },
          type: 'review',
          doi: null,
        },
      ],
    }))
    const results = await getOpenAlexWorksByName('test')
    expect(results[0].openAccessUrl).toBe('https://example.com/landing')
  })

  test('encodes query parameter', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    await getOpenAlexWorksByName('ace inhibitor')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('ace%20inhibitor')
    expect(calledUrl).toContain('per_page=10')
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getOpenAlexWorksByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getOpenAlexWorksByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getOpenAlexWorksByName('aspirin')).rejects.toThrow(/network/)
  })
})