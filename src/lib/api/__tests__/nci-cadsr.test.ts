jest.mock('@/lib/api/utils', () => ({
  ...jest.requireActual('@/lib/api/utils'),
  getApiKey: jest.fn(),
}))

jest.mock('@/lib/api/sourceAvailability', () => ({
  isApiSourceDisabled: jest.fn(),
  getApiSourceDisabledReason: jest.fn(),
  DISABLED_API_SOURCES: {},
}))

import { fetchCadsrData } from '@/lib/api/nci-cadsr'
import { getApiKey } from '@/lib/api/utils'
import { isApiSourceDisabled } from '@/lib/api/sourceAvailability'

const mockGetApiKey = getApiKey as jest.Mock

function mockJsonFetch(body: unknown, ok = true) {
  return {
    ok,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  }
}

describe('NCI caDSR API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetApiKey.mockReturnValue('test-key')
    ;(isApiSourceDisabled as jest.Mock).mockReturnValue(false)
  })

  it('skips network when source is disabled', async () => {
    ;(isApiSourceDisabled as jest.Mock).mockReturnValue(true)
    const result = await fetchCadsrData('test')
    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.data.concepts).toEqual([])
  })

  it('should fetch and parse NCI caDSR data', async () => {
    ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValueOnce(
      mockJsonFetch({
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
    )

    const result = await fetchCadsrData('test')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cadsrapi.nci.nih.gov/cadsrapi/v1/concepts?q=test&api_key=test-key',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    )
    expect(result.source).toBe('NCI caDSR')
    expect(result.data.concepts).toHaveLength(1)
    expect(result.data.concepts[0].conceptId).toBe('12345')
    expect(result.data.concepts[0].preferredName).toBe('Test Concept')
    expect(result.timestamp).toBeTruthy()
  })

  it('should not include api_key when none provided', async () => {
    mockGetApiKey.mockReturnValue(undefined)
    ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValueOnce(mockJsonFetch({ concepts: [] }))

    const result = await fetchCadsrData('test')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cadsrapi.nci.nih.gov/cadsrapi/v1/concepts?q=test',
      expect.any(Object),
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
