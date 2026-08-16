import { getNihGrantsByName } from '@/lib/api/nihreporter'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

describe('getNihGrantsByName', () => {
  test('returns parsed grants on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
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
    }))
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

  test('blank query is true empty without fetch', async () => {
    expect(await getNihGrantsByName('   ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getNihGrantsByName('unknownxyz')).rejects.toThrow(/HTTP 503/)
  })

  test('true empty rows when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    const results = await getNihGrantsByName('aspirin')
    expect(results).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getNihGrantsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML response (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getNihGrantsByName('aspirin')).rejects.toThrow(/HTML/)
  })
})
