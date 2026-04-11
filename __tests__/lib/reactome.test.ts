import { getReactomePathwaysByName } from '@/lib/api/reactome'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getReactomePathwaysByName', () => {
  test('returns parsed pathways on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            typeName: 'Pathway',
            entries: [
              {
                stId: 'R-HSA-2162123',
                name: 'Synthesis of Prostaglandins (PG)',
                species: 'Homo sapiens',
                summation: 'Prostaglandins are synthesized from arachidonic acid.',
              },
              {
                stId: 'R-HSA-76002',
                name: 'Platelet activation',
                species: 'Homo sapiens',
                summation: 'Platelets are activated by several agonists.',
              },
            ],
          },
        ],
      }),
    })
    const results = await getReactomePathwaysByName('aspirin')
    expect(results).toHaveLength(2)
    expect(results[0].stId).toBe('R-HSA-2162123')
    expect(results[0].name).toBe('Synthesis of Prostaglandins (PG)')
    expect(results[0].species).toBe('Homo sapiens')
    expect(results[0].url).toBe('https://reactome.org/content/detail/R-HSA-2162123')
  })

  test('returns empty array when no Pathway type in results', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { typeName: 'Protein', entries: [{ stId: 'R-HSA-1', name: 'Some protein' }] },
        ],
      }),
    })
    const results = await getReactomePathwaysByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getReactomePathwaysByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getReactomePathwaysByName('aspirin')
    expect(results).toEqual([])
  })
})
