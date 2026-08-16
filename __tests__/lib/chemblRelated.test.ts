import { getRelatedCompoundsByTarget } from '@/lib/api/chembl'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getRelatedCompoundsByTarget', () => {
  test('maps units, pchembl, and enriches missing pref_name / max_phase', async () => {
    ;(fetch as jest.Mock)
      // activities
      .mockResolvedValueOnce(
        jsonRes({
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
      )
      // molecule enrich for CHEMBL297008
      .mockResolvedValueOnce(
        jsonRes({
          molecules: [
            {
              molecule_chembl_id: 'CHEMBL297008',
              pref_name: 'CELECOXIB ANALOG',
              max_phase: '2.0',
            },
          ],
        }),
      )

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

  test('true empty activities JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ activities: [] }))
    expect(await getRelatedCompoundsByTarget('CHEMBL230')).toEqual([])
  })

  test('blank target id is empty without fetch', async () => {
    expect(await getRelatedCompoundsByTarget('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getRelatedCompoundsByTarget('CHEMBL230')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getRelatedCompoundsByTarget('CHEMBL230')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getRelatedCompoundsByTarget('CHEMBL230')).rejects.toThrow(/network/)
  })
})
