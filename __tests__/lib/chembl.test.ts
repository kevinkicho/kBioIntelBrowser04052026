import { getChemblIdByName, getChemblActivitiesByName } from '@/lib/api/chembl'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getChemblIdByName', () => {
  test('returns ChEMBL ID on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
      }),
    })
    const id = await getChemblIdByName('aspirin')
    expect(id).toBe('CHEMBL25')
  })

  test('returns null when no molecules found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ molecules: [] }),
    })
    const id = await getChemblIdByName('unknownxyz')
    expect(id).toBeNull()
  })

  test('returns null on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const id = await getChemblIdByName('aspirin')
    expect(id).toBeNull()
  })
})

describe('getChemblActivitiesByName', () => {
  test('returns parsed activities on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
      }),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        activities: [
          {
            target_pref_name: 'Cyclooxygenase-2',
            standard_type: 'IC50',
            standard_value: 0.04,
            standard_units: 'uM',
            assay_type: 'B',
          },
        ],
      }),
    })
    const results = await getChemblActivitiesByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].targetName).toBe('Cyclooxygenase-2')
    expect(results[0].activityType).toBe('IC50')
    expect(results[0].activityValue).toBe(0.04)
    expect(results[0].activityUnits).toBe('uM')
    expect(results[0].assayType).toBe('B')
    expect(results[0].chemblId).toBe('CHEMBL25')
  })

  test('returns empty array when ChEMBL ID not found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ molecules: [] }),
    })
    const results = await getChemblActivitiesByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when activities response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
      }),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getChemblActivitiesByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getChemblActivitiesByName('aspirin')
    expect(results).toEqual([])
  })
})
