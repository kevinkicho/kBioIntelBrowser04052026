import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'

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

describe('getSemanticPapersByName', () => {
  test('returns parsed papers on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      data: [
        {
          paperId: 'abc123',
          title: 'Effects of Aspirin',
          year: 2023,
          citationCount: 42,
          url: 'https://semanticscholar.org/paper/abc123',
          tldr: { text: 'Aspirin reduces inflammation.' },
        },
      ],
    }))
    const results = await getSemanticPapersByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].paperId).toBe('abc123')
    expect(results[0].title).toBe('Effects of Aspirin')
    expect(results[0].year).toBe(2023)
    expect(results[0].citationCount).toBe(42)
    expect(results[0].tldr).toBe('Aspirin reduces inflammation.')
    expect(results[0].url).toBe('https://semanticscholar.org/paper/abc123')
  })

  test('uses Number() coercion and falls back to 0', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      data: [
        {
          paperId: 'x1',
          title: 'Test',
          year: null,
          citationCount: null,
          url: '',
          tldr: null,
        },
      ],
    }))
    const results = await getSemanticPapersByName('test')
    expect(results[0].year).toBe(0)
    expect(results[0].citationCount).toBe(0)
    expect(results[0].tldr).toBe('')
  })

  test('handles papers key instead of data key', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      papers: [
        {
          paperId: 'p1',
          title: 'Paper via papers key',
          year: 2022,
          citationCount: 5,
          url: 'https://example.com',
          tldr: { text: 'Summary' },
        },
      ],
    }))
    const results = await getSemanticPapersByName('test')
    expect(results).toHaveLength(1)
    expect(results[0].paperId).toBe('p1')
  })

  test('encodes query and includes correct fields', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: [] }))
    await getSemanticPapersByName('ace inhibitor')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('ace%20inhibitor')
    expect(calledUrl).toContain('limit=5')
    expect(calledUrl).toContain('fields=title,year,citationCount,abstract,url,tldr')
  })

  test('true empty papers is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: [] }))
    expect(await getSemanticPapersByName('unknownxyz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getSemanticPapersByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getSemanticPapersByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getSemanticPapersByName('aspirin')).rejects.toThrow(/network/)
  })
})