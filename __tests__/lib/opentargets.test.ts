import { getDiseaseAssociationsByName } from '@/lib/api/opentargets'
import * as chembl from '@/lib/api/chembl'

jest.mock('@/lib/api/chembl')
global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

describe('getDiseaseAssociationsByName', () => {
  test('returns parsed disease associations on success', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue('CHEMBL25')
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      data: {
        drug: {
          name: 'ASPIRIN',
          linkedDiseases: {
            rows: [
              {
                disease: {
                  id: 'EFO_0000311',
                  name: 'Type 2 diabetes mellitus',
                  therapeuticAreas: [{ id: 'TA_0001', name: 'Metabolic disease' }],
                },
              },
            ],
          },
        },
      },
    }))
    const results = await getDiseaseAssociationsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].diseaseId).toBe('EFO_0000311')
    expect(results[0].diseaseName).toBe('Type 2 diabetes mellitus')
    expect(results[0].therapeuticAreas).toEqual(['Metabolic disease'])
  })

  test('falls back to disease search when ChEMBL ID not found', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue(null)
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: { search: { hits: [] } } }))
    const results = await getDiseaseAssociationsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue('CHEMBL25')
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getDiseaseAssociationsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue('CHEMBL25')
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getDiseaseAssociationsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('returns empty array when drug has no linked diseases and search is empty', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue('CHEMBL25')
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({
        data: { drug: { name: 'ASPIRIN', linkedDiseases: { rows: [] } } },
      }))
      .mockResolvedValueOnce(jsonRes({ data: { search: { hits: [] } } }))
    const results = await getDiseaseAssociationsByName('aspirin')
    expect(results).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue('CHEMBL25')
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getDiseaseAssociationsByName('aspirin')).rejects.toThrow(/network/)
  })
})
