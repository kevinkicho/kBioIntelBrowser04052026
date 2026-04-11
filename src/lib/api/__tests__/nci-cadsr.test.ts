// Unit tests for NCI caDSR API utility.

import { fetchCadsrData } from '../nci-cadsr'
import { standardizeResponse } from '../utils'

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
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
) as jest.Mock

describe('NCI caDSR API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NCI_CADSR_API_KEY = 'test-key'
  })

  it('should fetch and parse NCI caDSR data', async () => {
    const result = await fetchCadsrData('test')
    
    expect(fetch).toHaveBeenCalledWith(
      'https://cadsrapi.nci.nih.gov/cadsrapi/v1/concepts?q=test&api_key=test-key'
    )
    expect(result).toEqual(
      standardizeResponse(
        {
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
        },
        'NCI caDSR'
      )
    )
  })

  it('should handle missing API key gracefully', async () => {
    delete process.env.NCI_CADSR_API_KEY
    const result = await fetchCadsrData('test')
    
    expect(result).toEqual(
      standardizeResponse({ concepts: [] }, 'NCI caDSR')
    )
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchCadsrData('test')
    
    expect(result).toEqual(
      standardizeResponse({ concepts: [] }, 'NCI caDSR')
    )
  })
})