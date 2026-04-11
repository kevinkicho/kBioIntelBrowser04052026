import { searchMolecules, getMoleculeById } from '@/lib/api/pubchem'

// Mock global fetch
global.fetch = jest.fn()

beforeEach(() => {
  jest.resetAllMocks()
})

describe('searchMolecules', () => {
  test('returns search results for a valid query', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dictionary_terms: { compound: ['insulin', 'Insulin Glargine', 'Insulin Aspart'] },
      }),
    })

    const results = await searchMolecules('insulin')
    expect(results).toEqual(['insulin', 'Insulin Glargine', 'Insulin Aspart'])
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('pubchem.ncbi.nlm.nih.gov'),
      expect.any(Object)
    )
  })

  test('returns empty array when no results found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await searchMolecules('xyznotacompound')
    expect(results).toEqual([])
  })

  test('returns empty array on fetch error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    const results = await searchMolecules('insulin')
    expect(results).toEqual([])
  })
})

describe('getMoleculeById', () => {
  test('returns molecule data for a valid CID', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          PropertyTable: {
            Properties: [{
              CID: 5793,
              MolecularFormula: 'C6H12O6',
              IUPACName: 'D-glucose',
              MolecularWeight: '180.16',
              Title: 'Glucose',
            }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          InformationList: {
            Information: [{
              CID: 5793,
              Synonym: ['Dextrose', 'Blood sugar', 'D-Glucose'],
            }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          InformationList: {
            Information: [{
              CID: 5793,
              Description: ['A simple sugar that is an important energy source.'],
            }],
          },
        }),
      })

    const molecule = await getMoleculeById(5793)
    expect(molecule).not.toBeNull()
    expect(molecule!.cid).toBe(5793)
    expect(molecule!.name).toBe('Glucose')
    expect(molecule!.formula).toBe('C6H12O6')
    expect(molecule!.synonyms).toContain('Dextrose')
  })

  test('returns null when CID not found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404 })
    const result = await getMoleculeById(9999999999)
    expect(result).toBeNull()
  })
})
