import { getSecFilingsByName } from '@/lib/api/secedgar'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getSecFilingsByName', () => {
  test('returns parsed filings on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hits: {
          hits: [
            {
              _source: {
                display_names: ['Novo Nordisk A/S'],
                entity_id: '1341439',
                file_date: '2023-02-15',
                form_type: '10-K',
                period_of_report: '2022-12-31',
              },
              _id: '0001341439-23-000010',
            },
          ],
        },
      }),
    })
    const results = await getSecFilingsByName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].companyName).toBe('Novo Nordisk A/S')
    expect(results[0].filingId).toBe('000134143923000010')
    expect(results[0].formType).toBe('10-K')
    expect(results[0].filingDate).toBe('2023-02-15')
    expect(results[0].url).toContain('000134143923000010')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getSecFilingsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when hits key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getSecFilingsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getSecFilingsByName('aspirin')
    expect(results).toEqual([])
  })
})
