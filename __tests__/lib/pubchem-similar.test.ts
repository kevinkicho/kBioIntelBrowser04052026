import { getSimilarMolecules } from '@/lib/api/pubchem-similar'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

function mockJsonFetch(body: unknown, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

describe('getSimilarMolecules', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns similar molecules', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonFetch({ IdentifierList: { CID: [2244, 5000, 5001] } }))
      .mockResolvedValueOnce(mockJsonFetch({ PropertyTable: { Properties: [
        { CID: 5000, Title: 'Mol1', MolecularFormula: 'C2H4', MolecularWeight: 28 },
        { CID: 5001, Title: 'Mol2', MolecularFormula: 'C3H6', MolecularWeight: 42 },
      ] } }))

    const result = await getSimilarMolecules(2244)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Mol1')
    expect(result[0].cid).toBe(5000)
  })

  it('returns empty array when PubChem lists no neighbors', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonFetch({ IdentifierList: { CID: [2244] } }))
    const result = await getSimilarMolecules(2244)
    expect(result).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonFetch({}, false, 503))
    await expect(getSimilarMolecules(2244)).rejects.toThrow(/HTTP/)
  })

  it('throws on HTML (not EMPTY)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      json: () => Promise.resolve({}),
    })
    await expect(getSimilarMolecules(2244)).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'))
    await expect(getSimilarMolecules(2244)).rejects.toThrow(/network/)
  })
})
