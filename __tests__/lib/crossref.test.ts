import { searchCrossRef, getCrossRefByDOI, getCitations } from '@/lib/api/crossref'

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

describe('searchCrossRef', () => {
  test('returns parsed works on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      message: {
        items: [
          {
            DOI: '10.1234/abc',
            title: ['Aspirin review'],
            author: [{ given: 'Jane', family: 'Doe' }],
            'container-title': ['Nature'],
            'published-print': { 'date-parts': [2021, 6] },
            type: 'journal-article',
            publisher: 'Springer',
            'is-referenced-by-count': 12,
            'references-count': 40,
          },
        ],
      },
    }))
    const results = await searchCrossRef('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].doi).toBe('10.1234/abc')
    expect(results[0].title).toBe('Aspirin review')
    expect(results[0].authors).toEqual(['Jane Doe'])
    expect(results[0].journal).toBe('Nature')
    expect(results[0].year).toBe(2021)
  })

  test('true empty items is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ message: { items: [] } }))
    expect(await searchCrossRef('unknownxyz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchCrossRef('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchCrossRef('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchCrossRef('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getCrossRefByDOI', () => {
  test('404 missing DOI is honest absence', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ status: 'error' }, 404))
    expect(await getCrossRefByDOI('10.9999/missing')).toBeNull()
  })

  test('throws on HTTP 503 (not null-as-empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getCrossRefByDOI('10.1234/abc')).rejects.toThrow(/HTTP 503/)
  })
})

describe('getCitations', () => {
  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getCitations('10.1234/abc')).rejects.toThrow(/HTTP 503/)
  })
})