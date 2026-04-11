"use strict"
import { fetchTranslatorData } from '@/lib/api/ncats-translator'
import { getApiKey, standardizeResponse } from '@/lib/api/utils'

jest.mock('@/lib/api/utils', () => ({
  getApiKey: jest.fn(() => 'fake-api-key'),
}))

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  ;(getApiKey as jest.Mock).mockReturnValue(null)
})

describe('fetchTranslatorData', () => {
  test('returns parsed results on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: {
          results: [
            {
              node_bindings: {
                n0: [{ id: 'MONDO:0005148', name: 'Type 2 Diabetes', type: 'Disease' }],
                n1: [{ id: 'PUBCHEM:2723601', name: 'Metformin', type: 'Chemical' }],
              },
              edge_bindings: { e0: [{ id: 'TREATS', type: 'TREATS' }] },
              analyses: [{ resource_id: 'DrugCentral', edge_label: 'TREATS', publications: [] }],
            },
          ],
        },
      }),
    })
    const response = await fetchTranslatorData('metformin')
    const results = response.data.associations
    expect(results).toHaveLength(1)
    expect(results[0].subject).toBe('MONDO:0005148')
    expect(results[0].predicate).toBe('TREATS')
    expect(results[0].object).toBe('PUBCHEM:2723601')
    expect(results[0].edgeLabel).toBe('TREATS')

  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const response = await fetchTranslatorData('unknownxyz')
    expect(response.data.associations).toEqual([])
  })

  test('returns empty array when message or results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const response = await fetchTranslatorData('metformin')
    expect(response.data.associations).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const response = await fetchTranslatorData('metformin')
    expect(response.data.associations).toEqual([])
  })
});