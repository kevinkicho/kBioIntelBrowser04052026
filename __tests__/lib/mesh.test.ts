import { getMeshTermsByName } from '@/lib/api/mesh'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getMeshTermsByName', () => {
  test('returns parsed MeSH terms on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          esearchresult: { idlist: ['D001241'] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            uids: ['D001241'],
            D001241: {
              ds_meshterms: ['Aspirin'],
              ds_scopenote: 'A non-steroidal anti-inflammatory agent.',
            },
          },
        }),
      })
    const results = await getMeshTermsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].meshId).toBe('D001241')
    expect(results[0].name).toBe('Aspirin')
    expect(results[0].scopeNote).toBe('A non-steroidal anti-inflammatory agent.')
    expect(results[0].treeNumbers).toEqual([])
    expect(results[0].url).toBe('https://meshb.nlm.nih.gov/record/ui?ui=D001241')
  })

  test('returns empty array when no UIDs found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        esearchresult: { idlist: [] },
      }),
    })
    expect(await getMeshTermsByName('unknownxyz')).toEqual([])
  })

  test('returns empty array when search fetch returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getMeshTermsByName('aspirin')).toEqual([])
  })

  test('returns empty array when summary fetch returns non-ok', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          esearchresult: { idlist: ['D001241'] },
        }),
      })
      .mockResolvedValueOnce({ ok: false })
    expect(await getMeshTermsByName('aspirin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getMeshTermsByName('aspirin')).toEqual([])
  })

  test('falls back to uid for name when ds_meshterms is empty', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          esearchresult: { idlist: ['D999999'] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            uids: ['D999999'],
            D999999: {
              ds_meshterms: [],
              ds_scopenote: '',
            },
          },
        }),
      })
    const results = await getMeshTermsByName('test')
    expect(results[0].name).toBe('D999999')
  })
})
