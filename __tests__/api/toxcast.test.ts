import { getToxCastData, getToxCastByDtxsid, getAssayDetails } from '@/lib/api/toxcast'
import { mockJsonResponse } from '../utils/mockFetch'

// Mock global fetch
global.fetch = jest.fn()

describe('ToxCast API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getToxCastData', () => {
    it('should fetch ToxCast data successfully', async () => {
      // 1) searchChemical -> CompTox /equal endpoint returns a result
      ;(fetch as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse([
          {
            dtxsid: 'DTXSID12345',
            dtxcid: '',
            searchWord: '50-00-0',
            searchMatch: 'CASRN',
            rank: 1,
          },
        ])
      )
      // 2) getChemicalDetail -> CompTox detail
      ;(fetch as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse({
          preferredName: 'Test Chemical',
          casRegistryNumber: '50-00-0',
          molecularFormula: '',
          molecularWeight: 0,
          synonyms: [],
          toxcastActiveAssays: 3,
          toxcastTotalAssays: 10,
        })
      )
      // 3) getToxCastBioactivity -> array of assays
      ;(fetch as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse([
          {
            assayId: 'ASSAY1',
            assayName: 'Test Assay',
            endpoint: 'Test',
            hitCall: 'Active',
            ac50: 0,
            potencyUnit: 'uM',
            nConst: 0,
            nGain: 0,
            nLoss: 0,
          },
        ])
      )

      const result = await getToxCastData('50-00-0')

      expect(result).not.toBeNull()
      expect(result!.casrn).toBe('50-00-0')
      expect(result!.dtxsid).toBe('DTXSID12345')
      expect(result!.chemicalName).toBe('Test Chemical')
      expect(result!.assays).toHaveLength(1)
      expect(result!.assays[0].assayId).toBe('ASSAY1')
      expect(result!.assays[0].assayName).toBe('Test Assay')
      expect(result!.assays[0].outcome).toBe('Active')
      expect(result!.summary.totalAssays).toBe(10)
      expect(result!.summary.activeAssays).toBe(3)
    })

    it('should return null when chemical not found', async () => {
      // searchChemical: equal endpoint empty
      ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse([]))
      // searchChemical: start-with endpoint also empty
      ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse([]))

      const result = await getToxCastData('invalid-cas')
      expect(result).toBeNull()
    })

    it('should return null on fetch error', async () => {
      // searchChemical: equal endpoint throws -> returns null
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await getToxCastData('50-00-0')
      expect(result).toBeNull()
    })
  })

  describe('getToxCastByDtxsid', () => {
    it('returns null when bioactivity has no assays', async () => {
      // getChemicalDetail
      ;(fetch as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse({
          preferredName: 'Test Chemical',
          casRegistryNumber: '',
          molecularFormula: '',
          molecularWeight: 0,
          synonyms: [],
          toxcastActiveAssays: 0,
          toxcastTotalAssays: 0,
        })
      )
      // getToxCastBioactivity (empty array)
      ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse([]))

      const result = await getToxCastByDtxsid('DTXSID12345')

      expect(result).toBeNull()
    })

    it('returns ToxCast data when bioactivity has assays', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse({
          preferredName: 'Test Chemical',
          casRegistryNumber: '',
          molecularFormula: '',
          molecularWeight: 0,
          synonyms: [],
          toxcastActiveAssays: 1,
          toxcastTotalAssays: 1,
        })
      )
      ;(fetch as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse([
          {
            assayId: 'ASSAY1',
            assayName: 'Test Assay',
            endpoint: 'Test',
            hitCall: 'Active',
            ac50: 0,
            potencyUnit: 'uM',
            nConst: 0,
            nGain: 0,
            nLoss: 0,
          },
        ])
      )

      const result = await getToxCastByDtxsid('DTXSID12345')

      expect(result).not.toBeNull()
      expect(result!.dtxsid).toBe('DTXSID12345')
      expect(result!.chemicalName).toBe('Test Chemical')
      expect(result!.assays).toHaveLength(1)
    })
  })

  describe('getAssayDetails', () => {
    it('should fetch assay details successfully', async () => {
      const mockAssay = { assay_id: 'ASSAY1', assay_name: 'Test Assay' }

      ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse(mockAssay))

      const result = await getAssayDetails('ASSAY1')

      expect(result).toEqual(mockAssay)
    })

    it('should return null on fetch failure', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse({}, { status: 500 })
      )

      const result = await getAssayDetails('INVALID')
      expect(result).toBeNull()
    })
  })
})
