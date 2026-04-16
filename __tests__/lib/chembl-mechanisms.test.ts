import { getChemblMechanismsByName } from '@/lib/api/chembl-mechanisms'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getChemblMechanismsByName', () => {
  test('returns parsed mechanisms on success', async () => {
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
          mechanisms: [
            {
              mechanism_of_action: 'Cyclooxygenase inhibitor',
              action_type: 'INHIBITOR',
              target_chembl_id: 'CHEMBL2094253',
              max_phase: 4,
              direct_interaction: true,
            },
          ],
        }),
      })

    const results = await getChemblMechanismsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].mechanismOfAction).toBe('Cyclooxygenase inhibitor')
    expect(results[0].actionType).toBe('INHIBITOR')
    expect(results[0].targetChemblId).toBe('CHEMBL2094253')
    expect(results[0].maxPhase).toBe(4)
    expect(results[0].directInteraction).toBe(true)
  })

  test('returns empty array when molecule search returns no results', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ molecules: [] }),
    })
    const results = await getChemblMechanismsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when molecule search fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getChemblMechanismsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array when mechanism fetch fails', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
        }),
      })
      .mockResolvedValueOnce({ ok: false })
    const results = await getChemblMechanismsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getChemblMechanismsByName('aspirin')
    expect(results).toEqual([])
  })
})
