import { getGeneInfoByName } from '@/lib/api/ncbi-gene'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getGeneInfoByName', () => {
  test('returns parsed gene info on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ esearchresult: { idlist: ['1636'] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            '1636': {
              Name: 'ACE',
              Description: 'angiotensin I converting enzyme',
              Summary: 'This gene encodes an enzyme involved in catalyzing the conversion of angiotensin I into a physiologically active peptide angiotensin II.',
              Chromosome: '17',
              Organism: { ScientificName: 'Homo sapiens' },
            },
          },
        }),
      })
    const results = await getGeneInfoByName('ACE')
    expect(results).toHaveLength(1)
    expect(results[0].geneId).toBe('1636')
    expect(results[0].symbol).toBe('ACE')
    expect(results[0].name).toBe('angiotensin I converting enzyme')
    expect(results[0].chromosome).toBe('17')
    expect(results[0].organism).toBe('Homo sapiens')
    expect(results[0].url).toBe('https://www.ncbi.nlm.nih.gov/gene/1636')
  })

  test('returns empty array when no gene IDs found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ esearchresult: { idlist: [] } }),
    })
    expect(await getGeneInfoByName('unknownxyz')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('throws when search returns HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    })
    await expect(getGeneInfoByName('ACE')).rejects.toThrow(/HTTP 503/)
  })

  test('throws when summary returns HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ esearchresult: { idlist: ['1636'] } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      })
    await expect(getGeneInfoByName('ACE')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getGeneInfoByName('ACE')).rejects.toThrow(/network/)
  })

  test('handles missing result entry gracefully', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ esearchresult: { idlist: ['1636'] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: {} }),
      })
    expect(await getGeneInfoByName('ACE')).toEqual([])
  })
})
