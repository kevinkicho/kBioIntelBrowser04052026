import { getLiteratureByName } from '@/lib/api/europepmc'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getLiteratureByName', () => {
  test('returns parsed results on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      }),
    })
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
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ resultList: { result: [] } }),
    })
    const results = await getLiteratureByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getLiteratureByName('metformin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getLiteratureByName('metformin')
    expect(results).toEqual([])
  })

  test('handles missing fields gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resultList: {
          result: [{ title: 'A paper' }],
        },
      }),
    })
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
