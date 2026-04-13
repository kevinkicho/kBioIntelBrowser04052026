import { getDrugGeneInteractionsByName } from '@/lib/api/dgidb'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getDrugGeneInteractionsByName', () => {
  test('returns parsed drug-gene interactions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          drugs: {
            nodes: [
              {
                conceptId: 'rxcui:1191',
                name: 'ASPIRIN',
                interactions: [
                  {
                    gene: { name: 'PTGS2', conceptId: 'ncbi:5743' },
                    interactionTypes: [{ type: 'inhibitor' }],
                    sources: [{ sourceDbName: 'DrugBank' }, { sourceDbName: 'ChEMBL' }],
                  },
                ],
              },
            ],
          },
        },
      }),
    })
    const results = await getDrugGeneInteractionsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].geneName).toBe('PTGS2')
    expect(results[0].geneSymbol).toBe('PTGS2')
    expect(results[0].drugName).toBe('aspirin')
    expect(results[0].interactionType).toBe('inhibitor')
    expect(results[0].source).toBe('DrugBank, ChEMBL')
    expect(results[0].url).toContain('dgidb.org/genes/PTGS2')
  })

  test('returns empty array when no matched drugs', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { drugs: { nodes: [] } },
      }),
    })
    expect(await getDrugGeneInteractionsByName('unknownxyz')).toEqual([])
  })

  test('returns empty array when API returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getDrugGeneInteractionsByName('aspirin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getDrugGeneInteractionsByName('aspirin')).toEqual([])
  })

  test('returns empty array when GraphQL errors present', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        errors: [{ message: 'some error' }],
      }),
    })
    expect(await getDrugGeneInteractionsByName('aspirin')).toEqual([])
  })

  test('deduplicates interactions by gene+type', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          drugs: {
            nodes: [
              {
                conceptId: 'rxcui:1191',
                name: 'ASPIRIN',
                interactions: [
                  {
                    gene: { name: 'PTGS2' },
                    interactionTypes: [{ type: 'inhibitor' }],
                    sources: [{ sourceDbName: 'DrugBank' }],
                  },
                  {
                    gene: { name: 'PTGS2' },
                    interactionTypes: [{ type: 'inhibitor' }],
                    sources: [{ sourceDbName: 'ChEMBL' }],
                  },
                ],
              },
            ],
          },
        },
      }),
    })
    const results = await getDrugGeneInteractionsByName('aspirin')
    const ptgs2Items = results.filter(r => r.geneName === 'PTGS2')
    expect(ptgs2Items.length).toBe(1)
  })

  test('limits results to 20', async () => {
    const manyInteractions = Array.from({ length: 25 }, (_, i) => ({
      gene: { name: `GENE${i}` },
      interactionTypes: [{ type: 'inhibitor' }],
      sources: [{ sourceDbName: 'DrugBank' }],
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          drugs: {
            nodes: [
              {
                conceptId: 'rxcui:1191',
                name: 'ASPIRIN',
                interactions: manyInteractions,
              },
            ],
          },
        },
      }),
    })
    const results = await getDrugGeneInteractionsByName('aspirin')
    expect(results).toHaveLength(20)
  })
})