import { getRelatedCompoundsByTarget } from '@/lib/api/chembl'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getRelatedCompoundsByTarget', () => {
  test('maps units, pchembl, and enriches missing pref_name / max_phase', async () => {
    ;(fetch as jest.Mock)
      // activities
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activities: [
            {
              molecule_chembl_id: 'CHEMBL297008',
              molecule_pref_name: null,
              standard_value: '60.0',
              standard_units: 'nM',
              standard_type: 'IC50',
              pchembl_value: '7.22',
              target_chembl_id: 'CHEMBL230',
              target_pref_name: 'Prostaglandin G/H synthase 2',
            },
            {
              molecule_chembl_id: 'CHEMBL25',
              molecule_pref_name: 'ASPIRIN',
              standard_value: '1000',
              standard_units: 'nM',
              standard_type: 'IC50',
              pchembl_value: '6.0',
              molecule_max_phase: 4,
              target_chembl_id: 'CHEMBL230',
            },
          ],
        }),
      })
      // molecule enrich for CHEMBL297008
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          molecules: [
            {
              molecule_chembl_id: 'CHEMBL297008',
              pref_name: 'CELECOXIB ANALOG',
              max_phase: '2.0',
            },
          ],
        }),
      })

    const results = await getRelatedCompoundsByTarget('CHEMBL230', 10)
    expect(results.length).toBe(2)

    const enriched = results.find((r) => r.chemblId === 'CHEMBL297008')!
    expect(enriched.name).toBe('CELECOXIB ANALOG')
    expect(enriched.maxPhase).toBe(2)
    expect(enriched.activityUnits).toBe('nM')
    expect(enriched.pchemblValue).toBeCloseTo(7.22)
    expect(enriched.url).toContain('explore/compound/CHEMBL297008')

    const aspirin = results.find((r) => r.chemblId === 'CHEMBL25')!
    expect(aspirin.name).toBe('ASPIRIN')
    expect(aspirin.maxPhase).toBe(4)
  })

  test('returns empty on non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getRelatedCompoundsByTarget('CHEMBL230')).toEqual([])
  })
})
