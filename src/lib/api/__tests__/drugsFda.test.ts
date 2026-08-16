/**
 * @jest-environment node
 */

import { drugsAtFdaOverviewUrl, getDrugsFdaByName } from '../drugsFda'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

describe('drugsFda', () => {
  it('returns empty for short query without network', async () => {
    await expect(getDrugsFdaByName('a')).resolves.toEqual([])
    await expect(getDrugsFdaByName('')).resolves.toEqual([])
  })

  it('builds Drugs@FDA overview URL from application number digits', () => {
    expect(drugsAtFdaOverviewUrl('NDA021875')).toContain('ApplNo=021875')
    expect(drugsAtFdaOverviewUrl('')).toMatch(/cder\/daf/)
  })

  it('maps openFDA Drugs@FDA results', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            application_number: 'NDA021875',
            sponsor_name: 'GILEAD SCIENCES INC',
            submissions: [{ submission_type: 'ORIG', submission_status_date: '20010827' }],
            products: [
              {
                brand_name: 'VIREAD',
                active_ingredients: [{ name: 'TENOFOVIR DISOPROXIL FUMARATE', strength: '300MG' }],
                dosage_form: 'TABLET',
                route: 'ORAL',
                marketing_status: 'Prescription',
              },
            ],
            openfda: {
              brand_name: ['VIREAD'],
              generic_name: ['TENOFOVIR DISOPROXIL FUMARATE'],
            },
          },
        ],
      }),
    }))
    // @ts-expect-error test mock
    global.fetch = fetchMock

    const rows = await getDrugsFdaByName('tenofovir', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].applicationNumber).toBe('NDA021875')
    expect(rows[0].brandName).toBe('VIREAD')
    expect(rows[0].sponsorName).toMatch(/GILEAD/i)
    expect(rows[0].products[0].activeIngredients).toMatch(/TENOFOVIR/i)
    expect(rows[0].drugsAtFdaUrl).toContain('ApplNo=')
    expect(JSON.stringify(fetchMock.mock.calls)).toContain('+OR+')
  })
})

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

describe('getDrugsFdaByName honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    global.fetch = jest.fn() as typeof fetch
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  test('404 no-matches is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ error: { code: 'NOT_FOUND' } }, 404))
    expect(await getDrugsFdaByName('unknownxyz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    expect(await getDrugsFdaByName('aspirin')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getDrugsFdaByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getDrugsFdaByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getDrugsFdaByName('aspirin')).rejects.toThrow(/network/)
  })
})

describe('Drugs@FDA trackedSafe honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    global.fetch = jest.fn() as typeof fetch
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('drugs-fda', getDrugsFdaByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const dfa = metrics.find((m) => m.source === 'drugs-fda')
    expect(dfa?.loadStatus).toBe('error')
    expect(dfa?.error).toMatch(/HTTP 503/)
    expect(dfa?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ error: { code: 'NOT_FOUND' } }, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('drugs-fda', getDrugsFdaByName('unknownxyz'), []),
    )
    expect(value).toEqual([])
    const dfa = metrics.find((m) => m.source === 'drugs-fda')
    expect(dfa?.loadStatus).not.toBe('error')
    expect(dfa?.loadStatus).not.toBe('timeout')
    expect(dfa?.error).toBeUndefined()
  })
})

