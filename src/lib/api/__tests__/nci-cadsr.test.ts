/**
 * NCI caDSR panel uses free NCI EVS REST (NCIt) after cadsrapi host died.
 */

import { fetchCadsrData } from '@/lib/api/nci-cadsr'

function mockJsonFetch(body: unknown, ok = true) {
  return {
    ok,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  }
}

describe('NCI EVS (caDSR panel) API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('should fetch and map EVS concepts', async () => {
    ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValueOnce(
      mockJsonFetch({
        concepts: [
          {
            code: 'C287',
            name: 'Aspirin',
            terminology: 'ncit',
            version: '26.06e',
            conceptStatus: 'DEFAULT',
            active: true,
            definitions: [{ definition: 'A salicylate NSAID.' }],
          },
        ],
      }),
    )

    const result = await fetchCadsrData('aspirin')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api-evsrest.nci.nih.gov'),
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    )
    expect(result.source).toBe('NCI EVS (NCIt)')
    expect(result.data.concepts).toHaveLength(1)
    expect(result.data.concepts[0].conceptId).toBe('C287')
    expect(result.data.concepts[0].preferredName).toBe('Aspirin')
    expect(result.data.concepts[0].definition).toContain('salicylate')
    expect(result.timestamp).toBeTruthy()
  })

  it('returns empty for short query without network', async () => {
    const result = await fetchCadsrData('a')
    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.data.concepts).toEqual([])
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock) = jest.fn().mockRejectedValueOnce(new Error('API error'))
    const result = await fetchCadsrData('test')

    expect(result.source).toBe('NCI EVS (NCIt)')
    expect(result.data.concepts).toEqual([])
  })

  it('returns empty when response is not ok', async () => {
    ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValueOnce(mockJsonFetch({}, false))
    const result = await fetchCadsrData('test')
    expect(result.data.concepts).toEqual([])
  })
})
