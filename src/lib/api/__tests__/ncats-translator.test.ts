// Unit tests for NCATS Translator API utility.

import { fetchTranslatorData } from '../ncats-translator'
import { standardizeResponse } from '../utils'

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      message: {
        results: [
          {
            node_bindings: {
              n0: [{ id: 'test-subject' }],
              n1: [{ id: 'test-object' }],
            },
            edge_bindings: {
              e0: [{ id: 'test-predicate', type: 'test-edge' }],
            },
            analyses: [
              {
                resource_id: 'test-source',
                publications: ['pub1', 'pub2'],
              },
            ],
          },
        ],
      },
    }),
  })
) as jest.Mock

describe('NCATS Translator API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NCATS_TRANSLATOR_API_KEY = 'test-key'
  })

  it('should fetch and parse NCATS Translator data', async () => {
    const result = await fetchTranslatorData('test')
    
    expect(fetch).toHaveBeenCalledWith(
      'https://translator.ncats.io/api/v1/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key',
        },
        body: JSON.stringify({
          message: {
            query_graph: {
              nodes: [
                { id: 'n0', curie: 'test' },
                { id: 'n1', type: 'disease' },
                { id: 'n2', type: 'gene' },
              ],
              edges: [
                { id: 'e0', source_id: 'n0', target_id: 'n1' },
                { id: 'e1', source_id: 'n0', target_id: 'n2' },
              ],
            },
          },
        }),
      }
    )
    expect(result).toEqual(
      standardizeResponse(
        {
          associations: [
            {
              subject: 'test-subject',
              predicate: 'test-predicate',
              object: 'test-object',
              edgeLabel: 'test-edge',
              source: 'test-source',
              publications: ['pub1', 'pub2'],
            },
          ],
        },
        'NCATS Translator'
      )
    )
  })

  it('should handle missing API key gracefully', async () => {
    delete process.env.NCATS_TRANSLATOR_API_KEY
    const result = await fetchTranslatorData('test')
    
    expect(result).toEqual(
      standardizeResponse({ associations: [] }, 'NCATS Translator')
    )
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchTranslatorData('test')
    
    expect(result).toEqual(
      standardizeResponse({ associations: [] }, 'NCATS Translator')
    )
  })
})