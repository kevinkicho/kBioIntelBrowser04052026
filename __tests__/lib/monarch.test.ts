import { getMonarchDiseasesByName } from '@/lib/api/monarch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getMonarchDiseasesByName', () => {
  test('returns parsed diseases on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'MONDO:0011993',
            name: 'type 2 diabetes mellitus',
            description: 'A form of diabetes that is characterized by insulin resistance.',
            category: 'biolink:Disease',
            has_phenotype_count: 42,
          },
        ],
      }),
    })
    const results = await getMonarchDiseasesByName('metformin')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('MONDO:0011993')
    expect(results[0].name).toBe('type 2 diabetes mellitus')
    expect(results[0].description).toBe('A form of diabetes that is characterized by insulin resistance.')
    expect(results[0].phenotypeCount).toBe(42)
    expect(results[0].url).toBe('https://monarchinitiative.org/MONDO:0011993')
  })

  test('returns empty array when response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getMonarchDiseasesByName('unknown')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getMonarchDiseasesByName('metformin')).toEqual([])
  })

  test('handles missing fields gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'MONDO:0000001' }],
      }),
    })
    const results = await getMonarchDiseasesByName('test')
    expect(results[0].name).toBe('')
    expect(results[0].description).toBe('')
    expect(results[0].phenotypeCount).toBe(0)
  })
})
