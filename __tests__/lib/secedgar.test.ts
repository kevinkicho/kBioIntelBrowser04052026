import { getSecFilingsByName } from '@/lib/api/secedgar'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { mockJsonResponse } from '../utils/mockFetch'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

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
      }),
    )
    const results = await getSecFilingsByName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].companyName).toBe('Novo Nordisk A/S')
    expect(results[0].filingId).toBe('0001341439-23-000010')
    expect(results[0].formType).toBe('10-K')
    expect(results[0].filingDate).toBe('2023-02-15')
    expect(results[0].url).toContain('1341439')
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getSecFilingsByName('unknownxyz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}))
    expect(await getSecFilingsByName('aspirin')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getSecFilingsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getSecFilingsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getSecFilingsByName('aspirin')).rejects.toThrow(/network/)
  })
})

describe('SEC EDGAR trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('secedgar', getSecFilingsByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'secedgar')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('secedgar', getSecFilingsByName('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'secedgar')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
