import { getWikiPathwaysByName } from '@/lib/api/wikipathways'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getWikiPathwaysByName', () => {
  test('returns parsed pathways from Pathway Commons', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        searchHit: [
          { uri: 'https://www.wikipathways.org/pathways/WP123', name: 'ACE Inhibitor Pathway' },
        ],
      })
    )
    const results = await getWikiPathwaysByName('lisinopril')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('WP123')
    expect(results[0].name).toBe('ACE Inhibitor Pathway')
    expect(results[0].species).toBe('Homo sapiens')
    expect(results[0].url).toBe('https://www.wikipathways.org/pathways/WP123')
  })

  test('limits results to 10', async () => {
    const manyResults = Array.from({ length: 20 }, (_, i) => ({
      uri: `https://www.wikipathways.org/pathways/WP${i}`,
      name: `Pathway ${i}`,
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({ searchHit: manyResults })
    )
    const results = await getWikiPathwaysByName('test')
    expect(results).toHaveLength(10)
  })

  test('throws when Pathway Commons and Reactome both fail', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({}, { status: 500 })
    )
    await expect(getWikiPathwaysByName('test')).rejects.toThrow(/HTTP 500/)
  })

  test('throws on network error after both legs fail', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getWikiPathwaysByName('test')).rejects.toThrow(/network/)
  })

  test('returns empty array when both sources have zero hits', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(mockJsonResponse({}))
      .mockResolvedValueOnce(mockJsonResponse({}))
    expect(await getWikiPathwaysByName('test')).toEqual([])
  })
})
