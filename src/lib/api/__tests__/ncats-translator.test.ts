import { fetchTranslatorData } from '@/lib/api/ncats-translator'

global.fetch = jest.fn()

describe('NCATS Translator API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch and parse NCATS Translator data', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        entities: [
          { name: 'aspirin', id: 'CHEBI:15365', category: 'chemical' },
        ],
      }),
    })

    const result = await fetchTranslatorData('aspirin')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('arax.ncats.io'),
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) })
    )
    expect(result.source).toBe('NCATS Translator')
    expect(result.data.associations.length).toBeGreaterThanOrEqual(1)
    expect(result.data.associations[0].subject).toBe('aspirin')
    expect(result.timestamp).toBeTruthy()
  })

  it('should handle empty results', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const result = await fetchTranslatorData('unknown')

    expect(result.source).toBe('NCATS Translator')
    expect(result.data.associations).toEqual([])
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchTranslatorData('test')

    expect(result.source).toBe('NCATS Translator')
    expect(result.data.associations).toEqual([])
  })
})