"use strict"
import { fetchCadsrData } from '@/lib/api/nci-cadsr'
import { getApiKey, standardizeResponse } from '@/lib/api/utils'

jest.mock('@/lib/api/utils', () => ({
  getApiKey: jest.fn(() => 'fake-api-key'),
}))

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  ;(getApiKey as jest.Mock).mockReturnValue(null)
})

describe('fetchCadsrData', () => {
  test('returns parsed concepts on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        concepts: [
          {
            conceptId: 'C0025202',
            preferredName: 'Melanoma',
            definition: 'A malignant neoplasm derived from cells that are capable of forming melanin.',
            context: 'Neoplastic Process',
            workflowStatus: 'RELEASED',
            evsSource: 'NCI',
          },
        ],
      }),
    })
    const response = await fetchCadsrData('melanoma')
    const results = response.data.concepts
    expect(results).toHaveLength(1)
    expect(results[0].preferredName).toBe('Melanoma')
    expect(results[0].conceptId).toBe('C0025202')
    expect(results[0].definition).toBe('A malignant neoplasm derived from cells that are capable of forming melanin.')
    expect(results[0].context).toBe('Neoplastic Process')

  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const response = await fetchCadsrData('unknownxyz')
    expect(response.data.concepts).toEqual([])
  })

  test('returns empty array when concepts key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const response = await fetchCadsrData('melanoma')
    expect(response.data.concepts).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const response = await fetchCadsrData('melanoma')
    expect(response.data.concepts).toEqual([])
  })
});