import { getWikiPathwaysByName } from '@/lib/api/wikipathways'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getWikiPathwaysByName', () => {
  test('returns parsed pathways filtered to Homo sapiens', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: [
          { id: 'WP123', name: 'ACE Inhibitor Pathway', species: 'Homo sapiens' },
          { id: 'WP456', name: 'Mouse Pathway', species: 'Mus musculus' },
        ],
      }),
    })
    const results = await getWikiPathwaysByName('lisinopril')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('WP123')
    expect(results[0].name).toBe('ACE Inhibitor Pathway')
    expect(results[0].species).toBe('Homo sapiens')
    expect(results[0].url).toBe('https://www.wikipathways.org/pathways/WP123')
  })

  test('limits results to 10', async () => {
    const manyResults = Array.from({ length: 20 }, (_, i) => ({
      id: `WP${i}`,
      name: `Pathway ${i}`,
      species: 'Homo sapiens',
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: manyResults }),
    })
    const results = await getWikiPathwaysByName('test')
    expect(results).toHaveLength(10)
  })

  test('returns empty array when fetch returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getWikiPathwaysByName('test')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getWikiPathwaysByName('test')).toEqual([])
  })

  test('returns empty array when result is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    expect(await getWikiPathwaysByName('test')).toEqual([])
  })
})
