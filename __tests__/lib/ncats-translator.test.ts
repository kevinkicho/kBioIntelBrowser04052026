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

  test('throws when API response is not ok (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({}, { status: 500 })
    )
    await expect(fetchTranslatorData('unknownxyz')).rejects.toThrow(/HTTP/)
  })

  test('returns empty array when entities key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}))
    const response = await fetchTranslatorData('metformin')
    expect(response.data.associations).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(fetchTranslatorData('metformin')).rejects.toThrow(/network/)
  })
})
