"use strict"
import { fetchTranslatorData } from '@/lib/api/ncats-translator'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
})

describe('fetchTranslatorData', () => {
  test('returns parsed results on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        entities: [
          {
            id: 'CHEMBL.COMPOUND:CHEMBL1431',
            name: 'metformin',
            category: 'biolink:ChemicalEntity',
          },
        ],
      })
    )
    const response = await fetchTranslatorData('metformin')
    const results = response.data.associations
    expect(results).toHaveLength(1)
    expect(results[0].subject).toBe('metformin')
    expect(results[0].predicate).toBe('related_to')
    expect(results[0].object).toBe('biolink:ChemicalEntity')
    expect(results[0].edgeLabel).toBe('biolink:ChemicalEntity')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({}, { status: 500 })
    )
    const response = await fetchTranslatorData('unknownxyz')
    expect(response.data.associations).toEqual([])
  })

  test('returns empty array when entities key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}))
    const response = await fetchTranslatorData('metformin')
    expect(response.data.associations).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const response = await fetchTranslatorData('metformin')
    expect(response.data.associations).toEqual([])
  })
});
