import { searchGenes, getMyGeneData } from '@/lib/api/mygene'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

describe('searchGenes', () => {
  test('merges symbol + free-text hits', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({
        hits: [{ symbol: 'ACE', entrezgene: 1636, name: 'angiotensin I converting enzyme' }],
      }))
      .mockResolvedValueOnce(jsonRes({
        hits: [{ symbol: 'ACE2', entrezgene: 59272, name: 'angiotensin converting enzyme 2' }],
      }))
    const results = await searchGenes('ACE')
    expect(results.map((g) => g.symbol)).toEqual(['ACE', 'ACE2'])
  })

  test('returns empty array for blank query', async () => {
    expect(await searchGenes('   ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('returns empty array when both queries are zero-hit JSON', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ hits: [] }))
      .mockResolvedValueOnce(jsonRes({ hits: [] }))
    expect(await searchGenes('unknownxyz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(searchGenes('ACE')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchGenes('ACE')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(searchGenes('ACE')).rejects.toThrow(/network/)
  })
})

describe('getMyGeneData', () => {
  test('wraps search hits', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({
        hits: [{ symbol: 'ACE', entrezgene: 1636, name: 'angiotensin I converting enzyme' }],
      }))
      .mockResolvedValueOnce(jsonRes({ hits: [] }))
    const result = await getMyGeneData('ACE')
    expect(result.genes).toHaveLength(1)
    expect(result.genes[0].symbol).toBe('ACE')
  })
})
