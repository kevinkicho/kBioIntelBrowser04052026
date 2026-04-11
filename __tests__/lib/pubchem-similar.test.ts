import { getSimilarMolecules } from '@/lib/api/pubchem-similar'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('getSimilarMolecules', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns similar molecules', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ IdentifierList: { CID: [2244, 5000, 5001] } }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ PropertyTable: { Properties: [
        { CID: 5000, Title: 'Mol1', MolecularFormula: 'C2H4', MolecularWeight: 28 },
        { CID: 5001, Title: 'Mol2', MolecularFormula: 'C3H6', MolecularWeight: 42 },
      ] } }) })

    const result = await getSimilarMolecules(2244)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Mol1')
    expect(result[0].cid).toBe(5000)
  })

  it('returns empty array on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const result = await getSimilarMolecules(2244)
    expect(result).toEqual([])
  })
})
