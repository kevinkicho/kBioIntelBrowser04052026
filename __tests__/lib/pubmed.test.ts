import { searchPubMed, getPubMedArticle, getRelatedArticles } from '@/lib/api/pubmed'

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

describe('searchPubMed', () => {
  test('returns parsed articles on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['12345'] } }))
      .mockResolvedValueOnce(jsonRes({
        result: {
          '12345': {
            title: 'Aspirin and inflammation',
            authors: [{ name: 'Smith J' }],
            fulljournalname: 'Nature',
            pubdate: '2021',
            volume: '12',
            issue: '3',
            pages: '10-20',
            pmcid: 'PMC1',
          },
        },
      }))
    const results = await searchPubMed('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].pmid).toBe('12345')
    expect(results[0].title).toBe('Aspirin and inflammation')
    expect(results[0].authors).toEqual(['Smith J'])
    expect(results[0].journal).toBe('Nature')
    expect(results[0].url).toBe('https://pubmed.ncbi.nlm.nih.gov/12345/')
  })

  test('true empty idlist is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: [] } }))
    expect(await searchPubMed('unknownxyz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchPubMed('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchPubMed('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchPubMed('aspirin')).rejects.toThrow(/network/)
  })

  test('throws when esummary HTTP fails after a hit list', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['12345'] } }))
      .mockResolvedValueOnce(jsonRes({}, 502))
    await expect(searchPubMed('aspirin')).rejects.toThrow(/HTTP 502/)
  })
})

describe('getPubMedArticle', () => {
  test('throws on HTTP 503 (not null-as-empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPubMedArticle('12345')).rejects.toThrow(/HTTP 503/)
  })
})

describe('getRelatedArticles', () => {
  test('true empty related list is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ linksets: [{ linksetDbDatas: [{ links: [] }] }] }))
    expect(await getRelatedArticles('12345')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getRelatedArticles('12345')).rejects.toThrow(/HTTP 503/)
  })
})