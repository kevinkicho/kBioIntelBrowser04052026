import { getNciConceptsByName } from '@/lib/api/nci-thesaurus'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getNciConceptsByName', () => {
  test('returns parsed concepts on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        concepts: [
          {
            code: 'C61948',
            name: 'Aspirin',
            terminology: 'ncit',
            conceptStatus: 'Retired_Concept',
            leaf: true,
          },
        ],
      }),
    })
    const results = await getNciConceptsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].code).toBe('C61948')
    expect(results[0].name).toBe('Aspirin')
    expect(results[0].conceptStatus).toBe('Retired_Concept')
    expect(results[0].leaf).toBe(true)
    expect(results[0].url).toContain('C61948')
  })

  test('returns empty array when response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getNciConceptsByName('unknown')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getNciConceptsByName('aspirin')).toEqual([])
  })

  test('defaults conceptStatus to DEFAULT when missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        concepts: [{ code: 'C1234', name: 'Test', terminology: 'ncit' }],
      }),
    })
    const results = await getNciConceptsByName('test')
    expect(results[0].conceptStatus).toBe('DEFAULT')
    expect(results[0].leaf).toBe(false)
  })
})
