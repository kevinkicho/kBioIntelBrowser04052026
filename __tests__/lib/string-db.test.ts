import { getProteinInteractionsByName } from '@/lib/api/string-db'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getProteinInteractionsByName', () => {
  test('returns parsed protein interactions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          stringId_A: '9606.ENSP00000290421',
          stringId_B: '9606.ENSP00000354558',
          preferredName_A: 'ACE',
          preferredName_B: 'AGT',
          score: '0.999',
          escore: '0.8',
          dscore: '0.9',
          tscore: '0.7',
        },
      ]),
    })
    const results = await getProteinInteractionsByName('ACE')
    expect(results).toHaveLength(1)
    expect(results[0].proteinA).toBe('ACE')
    expect(results[0].proteinB).toBe('AGT')
    expect(results[0].score).toBe(0.999)
    expect(results[0].experimentalScore).toBe(0.8)
    expect(results[0].databaseScore).toBe(0.9)
    expect(results[0].textminingScore).toBe(0.7)
    expect(results[0].url).toBe('https://string-db.org/network/9606.ENSP00000290421')
  })

  test('uses Number() coercion and falls back to 0 for all score fields', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          stringId_A: '9606.ENSP00000290421',
          preferredName_A: 'ACE',
          preferredName_B: 'REN',
          score: null,
          escore: null,
          dscore: null,
          tscore: null,
        },
      ]),
    })
    const results = await getProteinInteractionsByName('ACE')
    expect(results[0].score).toBe(0)
    expect(results[0].experimentalScore).toBe(0)
    expect(results[0].databaseScore).toBe(0)
    expect(results[0].textminingScore).toBe(0)
  })

  test('encodes species=9606 in the request URL', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    await getProteinInteractionsByName('ACE')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('species=9606')
    expect(calledUrl).toContain('limit=10')
  })

  test('returns empty array when fetch returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getProteinInteractionsByName('ACE')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getProteinInteractionsByName('ACE')).toEqual([])
  })

  test('returns empty array when API returns empty list', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    expect(await getProteinInteractionsByName('unknownxyz')).toEqual([])
  })
})
