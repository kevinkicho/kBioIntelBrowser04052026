// Unit tests for NINDS NeuroMMSig API utility.

import { fetchNeuroMMSigData } from '../ninds-neurommsig'
import { standardizeResponse } from '../utils'

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      signatures: [
        {
          signatureId: '12345',
          name: 'Test Signature',
          disease: 'Test Disease',
          mechanism: 'Test Mechanism',
          genes: ['Gene1', 'Gene2'],
          drugs: ['Drug1'],
          evidence: 'Test evidence',
          publications: ['Pub1'],
        },
      ],
    }),
  })
) as jest.Mock

describe('NINDS NeuroMMSig API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NINDS_NEUROMMSIG_API_KEY = 'test-key'
  })

  it('should fetch and parse NINDS NeuroMMSig data', async () => {
    const result = await fetchNeuroMMSigData('test')
    
    expect(fetch).toHaveBeenCalledWith(
      'https://neurommsig.scai.fraunhofer.de/api/signatures?search=test&api_key=test-key'
    )
    expect(result).toEqual(
      standardizeResponse(
        {
          signatures: [
            {
              signatureId: '12345',
              name: 'Test Signature',
              disease: 'Test Disease',
              mechanism: 'Test Mechanism',
              genes: ['Gene1', 'Gene2'],
              drugs: ['Drug1'],
              evidence: 'Test evidence',
              publications: ['Pub1'],
            },
          ],
        },
        'NINDS NeuroMMSig'
      )
    )
  })

  it('should handle missing API key gracefully', async () => {
    delete process.env.NINDS_NEUROMMSIG_API_KEY
    const result = await fetchNeuroMMSigData('test')
    
    expect(result).toEqual(
      standardizeResponse({ signatures: [] }, 'NINDS NeuroMMSig')
    )
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchNeuroMMSigData('test')
    
    expect(result).toEqual(
      standardizeResponse({ signatures: [] }, 'NINDS NeuroMMSig')
    )
  })
})