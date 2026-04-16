jest.mock('@/lib/api/utils', () => ({
  ...jest.requireActual('@/lib/api/utils'),
  getApiKey: jest.fn(),
}))

import { fetchCadsrData } from '@/lib/api/nci-cadsr'
import { getApiKey } from '@/lib/api/utils'

const mockGetApiKey = getApiKey as jest.Mock

describe('NCI caDSR API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetApiKey.mockReturnValue('test-key')
  })

  it('should fetch and parse NCI caDSR data', async () => {
    ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        concepts: [
          {
            conceptId: '12345',
            preferredName: 'Test Concept',
            definition: 'Test definition',
            context: 'Test Context',
            workflowStatus: 'RELEASED',
            evsSource: 'NCI',
          },
        ],
      }),
    })

    const result = await fetchCadsrData('test')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cadsrapi.nci.nih.gov/cadsrapi/v1/concepts?q=test&api_key=test-key'
    )
    expect(result.source).toBe('NCI caDSR')
    expect(result.data.concepts).toHaveLength(1)
    expect(result.data.concepts[0].conceptId).toBe('12345')
    expect(result.data.concepts[0].preferredName).toBe('Test Concept')
    expect(result.timestamp).toBeTruthy()
  })

  it('should not include api_key when none provided', async () => {
    mockGetApiKey.mockReturnValue(undefined)
    ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ concepts: [] }),
    })

    const result = await fetchCadsrData('test')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cadsrapi.nci.nih.gov/cadsrapi/v1/concepts?q=test'
    )
    expect(result.data.concepts).toEqual([])
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock) = jest.fn().mockRejectedValueOnce(new Error('API error'))
    const result = await fetchCadsrData('test')

    expect(result.source).toBe('NCI caDSR')
    expect(result.data.concepts).toEqual([])
  })
})