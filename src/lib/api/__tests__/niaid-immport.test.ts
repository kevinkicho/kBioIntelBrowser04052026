// Unit tests for NIAID ImmPort API utility.

import { fetchImmPortData } from '../niaid-immport'
import { standardizeResponse } from '../utils'

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      studies: [
        {
          studyId: '12345',
          title: 'Test Study',
          description: 'Test description',
          studyType: 'Clinical Trial',
          conditionStudied: 'Test Condition',
          intervention: 'Test Intervention',
          participantCount: 50,
          arms: ['Arm A', 'Arm B'],
          reagents: ['Reagent 1'],
        },
      ],
    }),
  })
) as jest.Mock

describe('NIAID ImmPort API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NIAID_IMMPORT_API_KEY = 'test-key'
  })

  it('should fetch and parse NIAID ImmPort data', async () => {
    const result = await fetchImmPortData('test')
    
    expect(fetch).toHaveBeenCalledWith(
      'https://immport.org/data/query/study?search=test&api_key=test-key'
    )
    expect(result).toEqual(
      standardizeResponse(
        {
          studies: [
            {
              studyId: '12345',
              title: 'Test Study',
              description: 'Test description',
              studyType: 'Clinical Trial',
              conditionStudied: 'Test Condition',
              intervention: 'Test Intervention',
              participantCount: 50,
              arms: ['Arm A', 'Arm B'],
              reagents: ['Reagent 1'],
            },
          ],
        },
        'NIAID ImmPort'
      )
    )
  })

  it('should handle missing API key gracefully', async () => {
    delete process.env.NIAID_IMMPORT_API_KEY
    const result = await fetchImmPortData('test')
    
    expect(result).toEqual(
      standardizeResponse({ studies: [] }, 'NIAID ImmPort')
    )
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchImmPortData('test')
    
    expect(result).toEqual(
      standardizeResponse({ studies: [] }, 'NIAID ImmPort')
    )
  })
})