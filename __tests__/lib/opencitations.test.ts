import { getCitationMetrics } from '@/lib/api/opencitations'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getCitationMetrics', () => {
  test('returns parsed citation metrics on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ count: '42' }],
    })
    const results = await getCitationMetrics(['10.1000/test'])
    expect(results).toHaveLength(1)
    expect(results[0].doi).toBe('10.1000/test')
    expect(results[0].citationCount).toBe(42)
    expect(results[0].title).toBe('')
    expect(results[0].url).toBe('https://doi.org/10.1000/test')
  })

  test('limits to 10 DOIs', async () => {
    const dois = Array.from({ length: 15 }, (_, i) => `10.1000/test${i}`)
    dois.forEach(() => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ count: '1' }],
      })
    })
    const results = await getCitationMetrics(dois)
    expect(results).toHaveLength(10)
    expect(fetch).toHaveBeenCalledTimes(10)
  })

  test('returns empty array for empty DOI list', async () => {
    expect(await getCitationMetrics([])).toEqual([])
  })

  test('filters out failed individual fetches', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ count: '10' }],
      })
      .mockResolvedValueOnce({ ok: false })
    const results = await getCitationMetrics(['10.1000/a', '10.1000/b'])
    expect(results).toHaveLength(1)
    expect(results[0].doi).toBe('10.1000/a')
  })

  test('uses Number() coercion and falls back to 0', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ count: null }],
    })
    const results = await getCitationMetrics(['10.1000/test'])
    expect(results[0].citationCount).toBe(0)
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getCitationMetrics(['10.1000/test'])).toEqual([])
  })
})
