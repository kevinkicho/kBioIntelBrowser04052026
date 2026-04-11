import { getToxCastData, getToxCastByDtxsid, getAssayDetails } from '@/lib/api/toxcast'

// Mock global fetch
global.fetch = jest.fn()

describe('ToxCast API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getToxCastData', () => {
    it('should fetch ToxCast data successfully', async () => {
      // Mock searchChemical
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ dtxsid: 'DTXSID12345' }] })
      })

      // Mock getToxCastBioactivity
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assays: [
            { assay_id: 'ASSAY1', assay_name: 'Test Assay', endpoint: 'Test', outcome: 'Active' }
          ]
        })
      })

      // Mock getToxCastSummary
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalAssays: 10,
          activeAssays: 3,
          inactiveAssays: 5,
          inconclusiveAssays: 2,
          topHitSubcategory: 'Nuclear Receptor'
        })
      })

      // Mock getChemicalName
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferred_name: 'Test Chemical' })
      })

      const result = await getToxCastData('50-00-0')

      expect(result).toEqual({
        casrn: '50-00-0',
        dtxsid: 'DTXSID12345',
        chemicalName: 'Test Chemical',
        assays: [
          {
            assayId: 'ASSAY1',
            assayName: 'Test Assay',
            endpoint: 'Test',
            outcome: 'Active',
            potencyValue: undefined,
            potencyUnit: undefined,
            nConst: undefined,
            nGain: undefined,
            nLoss: undefined
          }
        ],
        summary: {
          totalAssays: 10,
          activeAssays: 3,
          inactiveAssays: 5,
          inconclusiveAssays: 2,
          topHitSubcategory: 'Nuclear Receptor'
        }
      })
    })

    it('should return null when chemical not found', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      })

      const result = await getToxCastData('invalid-cas')
      expect(result).toBeNull()
    })

    it('should return null on fetch error', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await getToxCastData('50-00-0')
      expect(result).toBeNull()
    })
  })

  describe('getToxCastByDtxsid', () => {
    it('should fetch ToxCast data by DTXSID', async () => {
      // Mock getToxCastBioactivity
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ assays: [] })
      })

      // Mock getToxCastSummary
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalAssays: 0,
          activeAssays: 0,
          inactiveAssays: 0,
          inconclusiveAssays: 0,
          topHitSubcategory: ''
        })
      })

      // Mock getChemicalName
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferred_name: 'Test Chemical' })
      })

      const result = await getToxCastByDtxsid('DTXSID12345')

      expect(result).toEqual({
        casrn: '',
        dtxsid: 'DTXSID12345',
        chemicalName: 'Test Chemical',
        assays: [],
        summary: {
          totalAssays: 0,
          activeAssays: 0,
          inactiveAssays: 0,
          inconclusiveAssays: 0,
          topHitSubcategory: ''
        }
      })
    })
  })

  describe('getAssayDetails', () => {
    it('should fetch assay details successfully', async () => {
      const mockAssay = { assay_id: 'ASSAY1', assay_name: 'Test Assay' }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAssay
      })

      const result = await getAssayDetails('ASSAY1')

      expect(result).toEqual(mockAssay)
    })

    it('should return null on fetch failure', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      })

      const result = await getAssayDetails('INVALID')
      expect(result).toBeNull()
    })
  })
})