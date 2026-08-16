import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'

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

describe('getChemblIndicationsByName', () => {
  test('returns parsed indications on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonRes({
          molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonRes({
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
      )

    const results = await getChemblIndicationsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].meshHeading).toBe('Pain')
    expect(results[0].meshId).toBe('D010146')
    expect(results[0].efoTerm).toBe('pain')
    expect(results[0].efoId).toBe('EFO_0003843')
    expect(results[0].maxPhaseForIndication).toBe(4)
    expect(results[0].moleculeChemblId).toBe('CHEMBL25')
    expect(results[0].url).toContain('CHEMBL25')
    expect(results[0].url).toMatch(/DrugIndications|drug_indications/)
    expect(results[0].url).not.toContain('/g/#')
  })

  test('true empty molecule search JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ molecules: [] }))
    expect(await getChemblIndicationsByName('unknownxyz')).toEqual([])
  })

  test('true empty indication JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ molecules: [{ molecule_chembl_id: 'CHEMBL25' }] }))
      .mockResolvedValueOnce(jsonRes({ drug_indications: [] }))
    expect(await getChemblIndicationsByName('aspirin')).toEqual([])
  })

  test('throws when molecule search HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getChemblIndicationsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws when indication fetch HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ molecules: [{ molecule_chembl_id: 'CHEMBL25' }] }))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getChemblIndicationsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getChemblIndicationsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getChemblIndicationsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('blank query is empty without fetch', async () => {
    expect(await getChemblIndicationsByName('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})