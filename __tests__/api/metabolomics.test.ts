import { getMetabolomicsData } from '@/lib/api/metabolomics'

// Mock global fetch
global.fetch = jest.fn()

describe('Metabolomics API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch metabolomics data successfully', async () => {
    const mockData = {
      metabolites: [
        { REFMET_NAME: 'glucose', FORMULA: 'C6H12O6', EXACT_MASS: '180.06' }
      ],
      studies: [
        { STUDY_ID: 'ST001', STUDY_TITLE: 'Glycolysis Study', NUM_METABOLITES: '5' }
      ]
    }

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/refmet/name/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockData.metabolites[0]] })
        })
      } else if (url.includes('/study/metabolite/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{
            STUDY_ID: 'ST001',
            STUDY_TITLE: 'Glycolysis Study',
            NUM_METABOLITES: '5'
          }] })
        })
      }
      return Promise.resolve({ ok: false })
    })

    const result = await getMetabolomicsData('glucose')

    expect(fetch).toHaveBeenCalled()
    if (result) {
        expect(result).toMatchObject({
        metabolites: [
          {
            refmetName: 'glucose',
            formula: 'C6H12O6',
            exactMass: 180.06,
          }
        ],
        studies: [
          {
            studyId: 'ST001',
            title: 'Glycolysis Study',
            metabolites: 5,
          }
        ]
      })
    } else {
      throw new Error('Result is null')
    }
  })

  it('should return null on fetch failure', async () => {
    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/refmet/name/')) {
        return Promise.resolve({ ok: false })
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) })
    })

    const result = await getMetabolomicsData('unknown-metabolite')
    expect(result).toBeNull()
  })

  it('should return null on exception', async () => {
    ;(fetch as jest.Mock).mockImplementation(() => Promise.reject(new Error('Network error')))

    const result = await getMetabolomicsData('glucose')
    expect(result).toBeNull()
  })
})