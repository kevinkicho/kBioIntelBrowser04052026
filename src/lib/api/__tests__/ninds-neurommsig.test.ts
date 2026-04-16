import { fetchNeuroMMSigData } from '@/lib/api/ninds-neurommsig'

global.fetch = jest.fn()

describe('NINDS NeuroMMSig API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch and parse NINDS NeuroGenetics data', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: '12345',
            gene_symbol: 'PTGS2',
            disease: 'Migraine',
            mechanism: 'Inflammation',
            evidence: 'Strong',
          },
        ],
      }),
    })

    const result = await fetchNeuroMMSigData('test')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('stemcells.nindsgenetics.org'),
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) })
    )
    expect(result.source).toBe('NINDS NeuroGenetics')
    expect(result.data.signatures).toHaveLength(1)
    expect(result.timestamp).toBeTruthy()
  })

  it('should handle empty results gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const result = await fetchNeuroMMSigData('nonexistent')

    expect(result.source).toBe('NINDS NeuroGenetics')
    expect(result.data.signatures).toEqual([])
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    const result = await fetchNeuroMMSigData('test')

    expect(result.source).toBe('NINDS NeuroGenetics')
    expect(result.data.signatures).toEqual([])
  })
})