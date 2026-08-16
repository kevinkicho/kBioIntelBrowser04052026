"use strict"
import { fetchNeuroMMSigData } from '@/lib/api/ninds-neurommsig'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
})

describe('fetchNeuroMMSigData', () => {
  test('returns parsed results on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        signatures: [
          {
            signatureId: 'APOE',
            name: 'APOE Signature',
            disease: 'Alzheimer Disease',
            mechanism: 'Amyloid-beta metabolism',
            evidence: 'Strong',
            genes: ['APOE'],
            drugs: [],
            publications: [],
          },
        ],
      }),
    )
    const response = await fetchNeuroMMSigData('APOE')
    const results = response.data.signatures
    expect(results).toHaveLength(1)
    expect(results[0].signatureId).toBe('APOE')
    expect(results[0].disease).toBe('Alzheimer Disease')
    expect(results[0].mechanism).toBe('Amyloid-beta metabolism')
    expect(results[0].evidence).toBe('Strong')
  })

  test('throws when API response is not ok (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}, { status: 500 }))
    await expect(fetchNeuroMMSigData('unknownxyz')).rejects.toThrow(/HTTP/)
  })

  test('returns empty array when signatures key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}))
    const response = await fetchNeuroMMSigData('APOE')
    expect(response.data.signatures).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(fetchNeuroMMSigData('APOE')).rejects.toThrow(/network/)
  })
})
