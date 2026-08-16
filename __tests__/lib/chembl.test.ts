import { getChemblIdByName, getChemblActivitiesByName } from '@/lib/api/chembl'

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

describe('getChemblIdByName', () => {
  test('returns ChEMBL ID on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
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
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ molecules: [] }),
    })
    const id = await getChemblIdByName('unknownxyz')
    expect(id).toBeNull()
  })

  test('throws on HTTP 503 (not null-as-empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getChemblIdByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not null-as-empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getChemblIdByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not null-as-empty)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getChemblIdByName('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getChemblActivitiesByName', () => {
  test('returns parsed activities on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
      }),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
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
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ molecules: [] }),
    })
    const results = await getChemblActivitiesByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('throws when activities HTTP fails after a ChEMBL id hit', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
      }),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 502))
    await expect(getChemblActivitiesByName('aspirin')).rejects.toThrow(/HTTP 502/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getChemblActivitiesByName('aspirin')).rejects.toThrow(/network/)
  })
})
