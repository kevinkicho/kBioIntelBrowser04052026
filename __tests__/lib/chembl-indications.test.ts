import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getChemblIndicationsByName', () => {
  test('returns parsed indications on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          drug_indications: [
            {
              mesh_heading: 'Pain',
              mesh_id: 'D010146',
              efo_term: 'pain',
              efo_id: 'EFO_0003843',
              max_phase_for_ind: 4,
            },
          ],
        }),
      })

    const results = await getChemblIndicationsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].meshHeading).toBe('Pain')
    expect(results[0].meshId).toBe('D010146')
    expect(results[0].efoTerm).toBe('pain')
    expect(results[0].efoId).toBe('EFO_0003843')
    expect(results[0].maxPhaseForIndication).toBe(4)
    expect(results[0].url).toContain('CHEMBL25')
  })

  test('returns empty array when molecule search returns no results', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ molecules: [] }),
    })
    const results = await getChemblIndicationsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when molecule search fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getChemblIndicationsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array when indication fetch fails', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
        }),
      })
      .mockResolvedValueOnce({ ok: false })
    const results = await getChemblIndicationsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getChemblIndicationsByName('aspirin')
    expect(results).toEqual([])
  })
})
