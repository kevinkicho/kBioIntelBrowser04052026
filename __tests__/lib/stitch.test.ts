import { getChemicalInteractionsByName } from '@/lib/api/stitch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getChemicalInteractionsByName', () => {
  test('returns parsed chemical-protein interactions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          stringId_A: 'CIDm002244',
          stringId_B: '9606.ENSP00000290421',
          preferredName_A: 'aspirin',
          preferredName_B: 'PTGS2',
          score: '0.95',
          escore: '0.7',
          dscore: '0.8',
          tscore: '0.6',
        },
      ]),
    })
    const results = await getChemicalInteractionsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].chemicalName).toBe('aspirin')
    expect(results[0].proteinName).toBe('PTGS2')
    expect(results[0].combinedScore).toBe(0.95)
    expect(results[0].experimentalScore).toBe(0.7)
    expect(results[0].databaseScore).toBe(0.8)
    expect(results[0].textminingScore).toBe(0.6)
    expect(results[0].url).toContain('stitch.embl.de/network/')
  })

  test('uses Number() coercion and falls back to 0 for scores', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          stringId_A: 'CIDm002244',
          preferredName_A: 'aspirin',
          preferredName_B: 'ACE',
          score: null,
          escore: null,
          dscore: null,
          tscore: null,
        },
      ]),
    })
    const results = await getChemicalInteractionsByName('aspirin')
    expect(results[0].combinedScore).toBe(0)
    expect(results[0].experimentalScore).toBe(0)
  })

  test('includes species=9606 in the request URL', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    await getChemicalInteractionsByName('aspirin')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('species=9606')
    expect(calledUrl).toContain('limit=10')
  })

  test('returns empty array when API returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getChemicalInteractionsByName('aspirin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getChemicalInteractionsByName('aspirin')).toEqual([])
  })

  test('returns empty array when API returns empty list', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    expect(await getChemicalInteractionsByName('unknownxyz')).toEqual([])
  })
})
