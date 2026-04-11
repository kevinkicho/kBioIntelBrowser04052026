import { getProteinAtlasBySymbols } from '@/lib/api/protein-atlas'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getProteinAtlasBySymbols', () => {
  test('returns parsed entries on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          Gene: 'ACE',
          Uniprot: ['P12821'],
          'Subcellular location': ['Cytoplasm', 'Cell membrane'],
        },
        { Gene: 'OTHER', Uniprot: ['Q00000'], 'Subcellular location': [] },
      ],
    })
    const results = await getProteinAtlasBySymbols(['ACE'])
    expect(results).toHaveLength(1)
    expect(results[0].gene).toBe('ACE')
    expect(results[0].uniprotId).toBe('P12821')
    expect(results[0].subcellularLocations).toEqual(['Cytoplasm', 'Cell membrane'])
    expect(results[0].url).toBe('https://www.proteinatlas.org/ACE')
  })

  test('returns empty array when symbols list is empty', async () => {
    expect(await getProteinAtlasBySymbols([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('skips symbols that return non-ok response', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getProteinAtlasBySymbols(['ACE'])
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getProteinAtlasBySymbols(['ACE'])).toEqual([])
  })

  test('limits to first 5 symbols', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ Gene: 'X', Uniprot: ['U1'], 'Subcellular location': [] }],
    })
    await getProteinAtlasBySymbols(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  test('deduplicates entries by gene', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ Gene: 'ACE', Uniprot: ['P12821'], 'Subcellular location': [] }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ Gene: 'ACE', Uniprot: ['P12821'], 'Subcellular location': [] }],
      })
    const results = await getProteinAtlasBySymbols(['ACE', 'ACE'])
    expect(results).toHaveLength(1)
  })
})
