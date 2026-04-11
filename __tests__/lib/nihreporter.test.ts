import { getNihGrantsByName } from '@/lib/api/nihreporter'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getNihGrantsByName', () => {
  test('returns parsed grants on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            project_num: 'R01DK099039',
            project_title: 'GLP-1 Mechanisms in Beta Cell Function',
            contact_pi_name: 'SMITH, JANE',
            org_name: 'National Institute of Diabetes',
            award_amount: 450000,
            project_start_date: '2020-09-01',
            project_end_date: '2025-08-31',
          },
        ],
      }),
    })
    const results = await getNihGrantsByName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].projectNumber).toBe('R01DK099039')
    expect(results[0].title).toBe('GLP-1 Mechanisms in Beta Cell Function')
    expect(results[0].piName).toBe('SMITH, JANE')
    expect(results[0].institute).toBe('National Institute of Diabetes')
    expect(results[0].fundingAmount).toBe(450000)
    expect(results[0].startDate).toBe('2020-09-01')
    expect(results[0].endDate).toBe('2025-08-31')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getNihGrantsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getNihGrantsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getNihGrantsByName('aspirin')
    expect(results).toEqual([])
  })
})
