import { getDrugGeneInteractionsByName } from '@/lib/api/dgidb'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getDrugGeneInteractionsByName', () => {
  test('returns parsed drug-gene interactions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matchedTerms: [
          {
            interactions: [
              {
                geneName: 'PTGS2',
                interactionTypes: ['inhibitor'],
                sources: ['DrugBank', 'ChEMBL'],
                score: 8.5,
              },
            ],
          },
        ],
      }),
    })
    const results = await getDrugGeneInteractionsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].geneName).toBe('PTGS2')
    expect(results[0].interactionType).toBe('inhibitor')
    expect(results[0].source).toBe('DrugBank, ChEMBL')
    expect(results[0].score).toBe(8.5)
    expect(results[0].url).toContain('dgidb.org/genes/PTGS2')
  })

  test('uses Number() coercion for score', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matchedTerms: [
          {
            interactions: [
              { geneName: 'ACE', interactionTypes: [], sources: [], score: '3.2' },
            ],
          },
        ],
      }),
    })
    const results = await getDrugGeneInteractionsByName('lisinopril')
    expect(results[0].score).toBe(3.2)
  })

  test('returns empty array when no matched terms', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ matchedTerms: [] }),
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

  test('limits results to 10', async () => {
    const manyInteractions = Array.from({ length: 15 }, (_, i) => ({
      geneName: `GENE${i}`, interactionTypes: [], sources: [], score: 0,
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ matchedTerms: [{ interactions: manyInteractions }] }),
    })
    const results = await getDrugGeneInteractionsByName('aspirin')
    expect(results).toHaveLength(10)
  })
})
