import { getDrugRecallsByName } from '@/lib/api/recalls'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getDrugRecallsByName', () => {
  test('returns parsed recalls on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      results: [
        {
          recall_number: 'D-0123-2025',
          classification: 'Class II',
          reason_for_recall: 'Failed dissolution specifications',
          product_description: 'Metformin HCl 500mg tablets',
          recalling_firm: 'Pharma Corp',
          report_date: '20250115',
          status: 'Ongoing',
          city: 'Newark',
          state: 'NJ',
        },
      ],
    }))
    const results = await getDrugRecallsByName('metformin')
    expect(results).toHaveLength(1)
    expect(results[0].recallNumber).toBe('D-0123-2025')
    expect(results[0].classification).toBe('Class II')
    expect(results[0].reason).toBe('Failed dissolution specifications')
    expect(results[0].recallingFirm).toBe('Pharma Corp')
    expect(results[0].reportDate).toBe('2025-01-15')
    expect(results[0].status).toBe('Ongoing')
  })

  test('404 no-matches is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ error: { code: 'NOT_FOUND' } }, 404))
    const results = await getDrugRecallsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getDrugRecallsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getDrugRecallsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('returns empty array when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    const results = await getDrugRecallsByName('aspirin')
    expect(results).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getDrugRecallsByName('aspirin')).rejects.toThrow(/network/)
  })
})