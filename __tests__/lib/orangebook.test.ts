import { getOrangeBookByName } from '@/lib/api/orangebook'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

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

describe('getOrangeBookByName', () => {
  test('returns parsed Orange Book entries on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      results: [
        {
          application_number: 'NDA021457',
          sponsor_name: 'NOVO NORDISK',
          submissions: [
            { submission_date: '20240315', submission_type: 'ORIG', submission_status: 'AP' },
          ],
          products: [
            {
              active_ingredients: [{ name: 'LIRAGLUTIDE' }],
              dosage_form: 'INJECTABLE',
              te_code: 'BX',
            },
          ],
          openfda: { generic_name: ['LIRAGLUTIDE'] },
        },
      ],
    }))
    const results = await getOrangeBookByName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].applicationNumber).toBe('NDA021457')
    expect(results[0].sponsorName).toBe('NOVO NORDISK')
    expect(results[0].dosageForm).toBe('INJECTABLE')
    expect(results[0].teCode).toBe('BX')
    expect(results[0].activeIngredient).toBe('LIRAGLUTIDE')
  })

  test('404 no-matches is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ error: { code: 'NOT_FOUND' } }, 404))
    expect(await getOrangeBookByName('unknownxyz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    expect(await getOrangeBookByName('aspirin')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getOrangeBookByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getOrangeBookByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getOrangeBookByName('aspirin')).rejects.toThrow(/network/)
  })
})

describe('Orange Book trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('orangebook', getOrangeBookByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const ob = metrics.find((m) => m.source === 'orangebook')
    expect(ob?.loadStatus).toBe('error')
    expect(ob?.error).toMatch(/HTTP 503/)
    expect(ob?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ error: { code: 'NOT_FOUND' } }, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('orangebook', getOrangeBookByName('unknownxyz'), []),
    )
    expect(value).toEqual([])
    const ob = metrics.find((m) => m.source === 'orangebook')
    expect(ob?.loadStatus).not.toBe('error')
    expect(ob?.loadStatus).not.toBe('timeout')
    expect(ob?.error).toBeUndefined()
  })
})
