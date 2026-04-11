import { getDiseaseAssociationsByName } from '@/lib/api/opentargets'
import * as chembl from '@/lib/api/chembl'

jest.mock('@/lib/api/chembl')
global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getDiseaseAssociationsByName', () => {
  test('returns parsed disease associations on success', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue('CHEMBL25')
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      }),
    })
    const results = await getDiseaseAssociationsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].diseaseId).toBe('EFO_0000311')
    expect(results[0].diseaseName).toBe('Type 2 diabetes mellitus')
    expect(results[0].therapeuticAreas).toEqual(['Metabolic disease'])
  })

  test('returns empty array when ChEMBL ID not found', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue(null)
    const results = await getDiseaseAssociationsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when API response is not ok', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue('CHEMBL25')
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getDiseaseAssociationsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array when drug has no linked diseases', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue('CHEMBL25')
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { drug: { name: 'ASPIRIN', linkedDiseases: { rows: [] } } },
      }),
    })
    const results = await getDiseaseAssociationsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(chembl.getChemblIdByName as jest.Mock).mockResolvedValue('CHEMBL25')
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getDiseaseAssociationsByName('aspirin')
    expect(results).toEqual([])
  })
})
