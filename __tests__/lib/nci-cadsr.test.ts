"use strict"
import { fetchCadsrData } from '@/lib/api/nci-cadsr'

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
})

describe('fetchCadsrData (NCI EVS)', () => {
  test('returns empty for short query without fetch', async () => {
    const response = await fetchCadsrData('a')
    expect(response.data.concepts).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('returns parsed concepts on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        concepts: [
          {
            code: 'C0025202',
            name: 'Melanoma',
            terminology: 'ncit',
            conceptStatus: 'DEFAULT',
            active: true,
            definitions: [
              {
                definition:
                  'A malignant neoplasm derived from cells that are capable of forming melanin.',
              },
            ],
          },
        ],
      }),
    })
    const response = await fetchCadsrData('melanoma')
    const results = response.data.concepts
    expect(results).toHaveLength(1)
    expect(results[0].preferredName).toBe('Melanoma')
    expect(results[0].conceptId).toBe('C0025202')
    expect(results[0].definition).toBe(
      'A malignant neoplasm derived from cells that are capable of forming melanin.',
    )
    expect(results[0].context).toBe('ncit')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api-evsrest.nci.nih.gov'),
      expect.any(Object),
    )
  })

  test('throws when API response is not ok (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: { get: () => '' },
    })
    await expect(fetchCadsrData('unknownxyz')).rejects.toThrow(/HTTP/)
  })

  test('returns empty array when concepts key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    })
    const response = await fetchCadsrData('melanoma')
    expect(response.data.concepts).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(fetchCadsrData('melanoma')).rejects.toThrow(/network/)
  })
})
