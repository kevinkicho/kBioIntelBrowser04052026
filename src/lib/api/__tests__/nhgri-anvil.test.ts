// Unit tests for NHGRI AnVIL API utility.

import { fetchAnvilData } from '../nhgri-anvil'
import { standardizeResponse } from '../utils'

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      datasets: [
        {
          datasetId: '12345',
          name: 'Test Dataset',
          description: 'Test description',
          studyName: 'Test Study',
          consentGroups: ['GRU'],
          dataTypes: ['Genomic'],
          participantCount: 100,
          sampleCount: 200,
        },
      ],
    }),
  })
) as jest.Mock

describe('NHGRI AnVIL API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NHGRI_ANVIL_API_KEY = 'test-key'
  })

  it('should fetch and parse NHGRI AnVIL data', async () => {
    const result = await fetchAnvilData('test')
    
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anvil.terra.bio/api/v1/datasets?search=test&api_key=test-key'
    )
    expect(result).toEqual(
      standardizeResponse(
        {
          datasets: [
            {
              datasetId: '12345',
              name: 'Test Dataset',
              description: 'Test description',
              studyName: 'Test Study',
              consentGroups: ['GRU'],
              dataTypes: ['Genomic'],
              participantCount: 100,
              sampleCount: 200,
            },
          ],
        },
        'NHGRI AnVIL'
      )
    )
  })

  it('should handle missing API key gracefully', async () => {
    delete process.env.NHGRI_ANVIL_API_KEY
    const result = await fetchAnvilData('test')
    
    expect(result).toEqual(
      standardizeResponse({ datasets: [] }, 'NHGRI AnVIL')
    )
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchAnvilData('test')
    
    expect(result).toEqual(
      standardizeResponse({ datasets: [] }, 'NHGRI AnVIL')
    )
  })
})