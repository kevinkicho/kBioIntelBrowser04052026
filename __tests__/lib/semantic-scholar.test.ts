import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getSemanticPapersByName', () => {
  test('returns parsed papers on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      }),
    })
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
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      }),
    })
    const results = await getSemanticPapersByName('test')
    expect(results[0].year).toBe(0)
    expect(results[0].citationCount).toBe(0)
    expect(results[0].tldr).toBe('')
  })

  test('handles papers key instead of data key', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      }),
    })
    const results = await getSemanticPapersByName('test')
    expect(results).toHaveLength(1)
    expect(results[0].paperId).toBe('p1')
  })

  test('encodes query and includes correct fields', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    })
    await getSemanticPapersByName('ace inhibitor')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('ace%20inhibitor')
    expect(calledUrl).toContain('limit=5')
    expect(calledUrl).toContain('fields=title,year,citationCount,abstract,url,tldr')
  })

  test('returns empty array when fetch returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getSemanticPapersByName('aspirin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getSemanticPapersByName('aspirin')).toEqual([])
  })
})
