import { getPdbeLigandsByName } from '@/lib/api/pdbe-ligands'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getPdbeLigandsByName', () => {
  test('returns parsed ligands from direct endpoint on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ASP: [
          {
            name: 'ASPIRIN',
            formula: 'C9H8O4',
            formula_weight: 180.16,
            inchi_key: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
            drugbank_id: 'DB00945',
          },
        ],
      }),
    })
    const results = await getPdbeLigandsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].compId).toBe('ASP')
    expect(results[0].name).toBe('ASPIRIN')
    expect(results[0].formula).toBe('C9H8O4')
    expect(results[0].molecularWeight).toBe(180.16)
    expect(results[0].inchiKey).toBe('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')
    expect(results[0].drugbankId).toBe('DB00945')
    expect(results[0].url).toBe('https://www.ebi.ac.uk/pdbe/entry/pdb/ASP')
  })

  test('falls back to search endpoint when direct returns 404', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 404, headers: { get: () => 'application/json' } })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            docs: [
              {
                compound_id: 'ASP',
                compound_name: 'ASPIRIN',
                formula: 'C9H8O4',
                formula_weight: 180.16,
              },
            ],
          },
        }),
      })
    const results = await getPdbeLigandsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].compId).toBe('ASP')
    expect(results[0].name).toBe('ASPIRIN')
    expect(results[0].inchiKey).toBe('')
    expect(results[0].drugbankId).toBe('')
  })

  test('throws when search returns HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    })
    await expect(getPdbeLigandsByName('unknown')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error after HET fallback (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
    await expect(getPdbeLigandsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('handles missing fields gracefully from direct endpoint', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        XYZ: [{}],
      }),
    })
    const results = await getPdbeLigandsByName('XYZ')
    expect(results[0].name).toBe('')
    expect(results[0].formula).toBe('')
    expect(results[0].molecularWeight).toBe(0)
    expect(results[0].inchiKey).toBe('')
    expect(results[0].drugbankId).toBe('')
  })
})
