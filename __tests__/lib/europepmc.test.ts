import { getLiteratureByName, getLiteratureHitCount } from '@/lib/api/europepmc'

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

describe('getLiteratureByName', () => {
  test('returns parsed results on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      resultList: {
        result: [
          {
            title: 'Metformin and cancer risk',
            authorString: 'Smith J, Doe A',
            journalTitle: 'Nature Reviews',
            pubYear: '2021',
            citedByCount: 342,
            doi: '10.1038/nrd.2021.12',
            pmid: '33456789',
          },
        ],
      },
    }))
    const results = await getLiteratureByName('metformin')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Metformin and cancer risk')
    expect(results[0].authors).toBe('Smith J, Doe A')
    expect(results[0].journal).toBe('Nature Reviews')
    expect(results[0].year).toBe(2021)
    expect(results[0].citedByCount).toBe(342)
    expect(results[0].doi).toBe('10.1038/nrd.2021.12')
    expect(results[0].pmid).toBe('33456789')
  })

  test('returns empty array when no results', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ resultList: { result: [] } }))
    const results = await getLiteratureByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getLiteratureByName('metformin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getLiteratureByName('metformin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getLiteratureByName('metformin')).rejects.toThrow(/network/)
  })

  test('handles missing fields gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      resultList: {
        result: [{ title: 'A paper' }],
      },
    }))
    const results = await getLiteratureByName('something')
    expect(results).toHaveLength(1)
    expect(results[0].authors).toBe('')
    expect(results[0].journal).toBe('')
    expect(results[0].year).toBe(0)
    expect(results[0].citedByCount).toBe(0)
    expect(results[0].doi).toBe('')
    expect(results[0].pmid).toBe('')
  })
})

describe('getLiteratureHitCount', () => {
  test('returns hitCount on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ hitCount: 42 }))
    expect(await getLiteratureHitCount('metformin')).toBe(42)
  })

  test('true zero hits is 0, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ hitCount: 0 }))
    expect(await getLiteratureHitCount('unknownxyz')).toBe(0)
  })

  test('throws on HTTP 503 so Discover novelty is not 0-as-success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getLiteratureHitCount('metformin')).rejects.toThrow(/HTTP 503/)
  })
})