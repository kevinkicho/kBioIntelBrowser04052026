import { getAdverseEventsByName } from '@/lib/api/adverseevents'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getAdverseEventsByName', () => {
  test('returns parsed adverse events on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            term: 'nausea',
            count: 1523,
            serious_count: 45,
            outcome: 'recovered/resolved',
          },
          {
            term: 'vomiting',
            count: 892,
            serious_count: 12,
            outcome: 'recovered/resolved',
          },
        ],
      }),
    })
    const results = await getAdverseEventsByName('liraglutide')
    expect(results).toHaveLength(2)
    expect(results[0].reactionName).toBe('nausea')
    expect(results[0].count).toBe(1523)
    expect(results[0].serious).toBe(45)
    expect(results[0].outcome).toBe('recovered/resolved')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getAdverseEventsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getAdverseEventsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getAdverseEventsByName('aspirin')
    expect(results).toEqual([])
  })
})
