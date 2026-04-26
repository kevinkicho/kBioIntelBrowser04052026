import { fetchCategoryData } from '@/lib/fetchCategory'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('fetchCategoryData', () => {
  beforeEach(() => mockFetch.mockReset())

  it('fetches category data from the correct endpoint', async () => {
    const mockData = { companies: [], drugLabels: [] }
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchCategoryData(2244, 'pharmaceutical')

    expect(mockFetch).toHaveBeenCalledWith('/api/molecule/2244/category/pharmaceutical', undefined)
    expect(result).toEqual(mockData)
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    await expect(fetchCategoryData(2244, 'pharmaceutical')).rejects.toThrow(
      'Failed to fetch pharmaceutical: 500'
    )
  })

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    await expect(fetchCategoryData(2244, 'pharmaceutical')).rejects.toThrow('Network error')
  })
})
