import { fetchNeuroMMSigData } from '@/lib/api/ninds-neurommsig'

function mockJsonFetch(body: unknown, ok = true) {
  const text = JSON.stringify(body)
  return {
    ok,
    status: ok ? 200 : 500,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => text,
    json: async () => body,
  }
}

global.fetch = jest.fn()

describe('NINDS NeuroMMSig API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch and parse NINDS NeuroGenetics data', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonFetch({
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
    )

    const result = await fetchNeuroMMSigData('test')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('stemcells.nindsgenetics.org'),
      expect.any(Object),
    )
    expect(result.source).toBe('NINDS NeuroGenetics')
    expect(result.data.signatures).toHaveLength(1)
    expect(result.timestamp).toBeTruthy()
  })

  it('should handle empty results gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonFetch({}))

    const result = await fetchNeuroMMSigData('nonexistent')

    expect(result.source).toBe('NINDS NeuroGenetics')
    expect(result.data.signatures).toEqual([])
  })

  it('throws on API errors (not EMPTY)', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API error'))) as jest.Mock
    await expect(fetchNeuroMMSigData('test')).rejects.toThrow(/API error/)
  })

  it('throws when response is not ok (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonFetch({}, false))
    await expect(fetchNeuroMMSigData('test')).rejects.toThrow(/HTTP/)
  })
})
