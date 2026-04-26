import { getSecFilingsByName } from '@/lib/api/secedgar'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getSecFilingsByName', () => {
  test('returns parsed filings on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        hits: {
          hits: [
            {
              _source: {
                display_names: ['Novo Nordisk A/S'],
                ciks: ['1341439'],
                file_date: '2023-02-15',
                root_forms: ['10-K'],
                form: '10-K',
                period_ending: '2022-12-31',
                adsh: '0001341439-23-000010',
              },
              _id: '0001341439-23-000010:doc',
            },
          ],
        },
      })
    )
    const results = await getSecFilingsByName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].companyName).toBe('Novo Nordisk A/S')
    expect(results[0].filingId).toBe('0001341439-23-000010')
    expect(results[0].formType).toBe('10-K')
    expect(results[0].filingDate).toBe('2023-02-15')
    expect(results[0].url).toContain('1341439')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({}, { status: 500 })
    )
    const results = await getSecFilingsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when hits key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}))
    const results = await getSecFilingsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getSecFilingsByName('aspirin')
    expect(results).toEqual([])
  })
})
