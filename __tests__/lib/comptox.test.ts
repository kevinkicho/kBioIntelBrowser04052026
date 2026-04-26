import { getCompToxByName } from '@/lib/api/comptox'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getCompToxByName', () => {
  test('returns parsed CompTox data on success', async () => {
    ;(fetch as jest.Mock)
      // 1) CompTox search
      .mockResolvedValueOnce(
        mockJsonResponse([
          {
            dtxsid: 'DTXSID7020182',
            dtxcid: 'DTXCID00182',
            searchWord: 'Aspirin',
            searchMatch: 'Approved Name',
            rank: 1,
            hasStructureImage: true,
          },
        ])
      )
      // 2) PubChem properties
      .mockResolvedValueOnce(
        mockJsonResponse({
          PropertyTable: {
            Properties: [
              {
                CID: 2244,
                MolecularFormula: 'C9H8O4',
                MolecularWeight: '180.16',
                InChIKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
                CanonicalSMILES: 'CC(=O)Oc1ccccc1C(=O)O',
              },
            ],
          },
        })
      )
      // 3) PubChem synonyms (includes a CAS-formatted entry)
      .mockResolvedValueOnce(
        mockJsonResponse({
          InformationList: {
            Information: [
              {
                CID: 2244,
                Synonym: ['Aspirin', '50-78-2', 'Acetylsalicylic acid'],
              },
            ],
          },
        })
      )
    const result = await getCompToxByName('Aspirin')
    expect(result).not.toBeNull()
    expect(result!.dtxsid).toBe('DTXSID7020182')
    expect(result!.casNumber).toBe('50-78-2')
    expect(result!.molecularFormula).toBe('C9H8O4')
    expect(result!.molecularWeight).toBeCloseTo(180.16, 2)
    expect(result!.structureUrl).toContain('DTXSID7020182')
    expect(result!.url).toBe('https://comptox.epa.gov/dashboard/chemical/details/DTXSID7020182')
  })

  test('falls back to first result when no name/Approved-Name match', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockJsonResponse([
          {
            dtxsid: 'DTXSID7020182',
            dtxcid: '',
            searchWord: 'something else',
            searchMatch: 'Synonym',
            rank: 1,
            hasStructureImage: false,
          },
        ])
      )
      // PubChem property + synonyms calls fail; parser swallows them
      .mockResolvedValueOnce(mockJsonResponse({}, { status: 500 }))
      .mockResolvedValueOnce(mockJsonResponse({}, { status: 500 }))
    const result = await getCompToxByName('Aspirin')
    expect(result).not.toBeNull()
    expect(result!.dtxsid).toBe('DTXSID7020182')
    expect(result!.toxcastActive).toBe(0)
    expect(result!.toxcastTotal).toBe(0)
  })

  test('returns null when search returns empty array', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse([]))
    expect(await getCompToxByName('unknownxyz')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('returns null when search returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({}, { status: 500 })
    )
    expect(await getCompToxByName('Aspirin')).toBeNull()
  })

  test('returns null when dtxsid is missing from search result', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([{ searchWord: 'Aspirin', searchMatch: 'Approved Name' }])
    )
    expect(await getCompToxByName('Aspirin')).toBeNull()
  })

  test('returns null on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getCompToxByName('Aspirin')).toBeNull()
  })
})
