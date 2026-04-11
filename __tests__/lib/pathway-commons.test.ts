import { getPathwayCommonsByName } from '@/lib/api/pathway-commons'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getPathwayCommonsByName', () => {
  test('returns parsed pathway results on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        searchHit: [
          {
            uri: 'https://reactome.org/content/detail/R-HSA-123',
            name: 'Aspirin Metabolism',
            dataSource: ['Reactome', 'KEGG'],
            numParticipants: 15,
          },
        ],
      }),
    })
    const results = await getPathwayCommonsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].pathwayId).toBe('https://reactome.org/content/detail/R-HSA-123')
    expect(results[0].pathwayName).toBe('Aspirin Metabolism')
    expect(results[0].source).toBe('Reactome, KEGG')
    expect(results[0].url).toBe('https://reactome.org/content/detail/R-HSA-123')
  })

  test('uses Number() coercion and falls back to defaults', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        searchHit: [
          {
            uri: 'some-local-id',
            name: 'Test',
            dataSource: 'SingleSource',
            numParticipants: null,
          },
        ],
      }),
    })
    const results = await getPathwayCommonsByName('test')
    expect(results[0].interactions).toBe(0)
    expect(results[0].source).toBe('SingleSource')
    expect(results[0].url).toBe('https://www.pathwaycommons.org/pc2/some-local-id')
  })

  test('encodes query parameter', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ searchHit: [] }),
    })
    await getPathwayCommonsByName('ace inhibitor')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('ace%20inhibitor')
    expect(calledUrl).toContain('type=Pathway')
  })

  test('returns empty array when fetch returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getPathwayCommonsByName('aspirin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getPathwayCommonsByName('aspirin')).toEqual([])
  })
})
