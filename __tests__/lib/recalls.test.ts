import { getDrugRecallsByName } from '@/lib/api/recalls'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getDrugRecallsByName', () => {
  test('returns parsed recalls on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      }),
    })
    const results = await getDrugRecallsByName('metformin')
    expect(results).toHaveLength(1)
    expect(results[0].recallNumber).toBe('D-0123-2025')
    expect(results[0].classification).toBe('Class II')
    expect(results[0].reason).toBe('Failed dissolution specifications')
    expect(results[0].recallingFirm).toBe('Pharma Corp')
    expect(results[0].reportDate).toBe('2025-01-15')
    expect(results[0].status).toBe('Ongoing')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getDrugRecallsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getDrugRecallsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getDrugRecallsByName('aspirin')
    expect(results).toEqual([])
  })
})
