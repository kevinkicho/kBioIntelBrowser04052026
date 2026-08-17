/**
 * @jest-environment node
 */

import { getHealthCanadaProductsByName } from '../healthCanadaDpd'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const SAMPLE_PRODUCT = {
  drug_code: 2049,
  drug_identification_number: '00326925',
  brand_name: 'SINEQUAN',
  company_name: 'ASPRI PHARMA CANADA INC',
  class_name: 'Human',
  descriptor: '',
  number_of_ais: '1',
  last_update_date: '2019-03-05',
}

function productFetchMock() {
  return jest.fn(async (url: unknown) => {
    const u = String(url)
    if (u.includes('/drugproduct/')) {
      return jsonRes([SAMPLE_PRODUCT])
    }
    if (u.includes('/status/')) {
      return jsonRes([{ status: 'Marketed', history_date: '1990-01-01' }])
    }
    if (u.includes('/form/')) {
      return jsonRes([{ pharmaceutical_form_name: 'Capsule' }])
    }
    if (u.includes('/route/')) {
      return jsonRes([{ route_of_administration_name: 'Oral' }])
    }
    if (u.includes('/activeingredient/')) {
      return jsonRes([
        { ingredient_name: 'DOXEPIN HYDROCHLORIDE', strength: '10', strength_unit: 'MG' },
      ])
    }
    return jsonRes(null, 404)
  })
}

describe('healthCanadaDpd', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    resetRateLimitBuckets()
    global.fetch = productFetchMock() as unknown as typeof fetch
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  it('returns empty for short query without network', async () => {
    global.fetch = jest.fn()
    await expect(getHealthCanadaProductsByName('a')).resolves.toEqual([])
    await expect(getHealthCanadaProductsByName('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps brand search when fetch returns sample product + details', async () => {
    const rows = await getHealthCanadaProductsByName('sinequan', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].din).toBe('00326925')
    expect(rows[0].brandName).toBe('SINEQUAN')
    expect(rows[0].status).toBe('Marketed')
    expect(rows[0].forms).toContain('Capsule')
    expect(rows[0].ingredients[0].name).toMatch(/DOXEPIN/i)
    expect(rows[0].url).toMatch(/health-products\.canada\.ca/)
  })

  it('zero-hit JSON is empty (not error)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonRes([]))
    await expect(getHealthCanadaProductsByName('unknownxyz')).resolves.toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonRes({}, 404))
    await expect(getHealthCanadaProductsByName('sinequan')).resolves.toEqual([])
  })

  it('throws when DPD search returns HTTP 503', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getHealthCanadaProductsByName('sinequan')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getHealthCanadaProductsByName('sinequan')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('network'))
    await expect(getHealthCanadaProductsByName('sinequan')).rejects.toThrow(/network/)
  })
})

describe('Health Canada DPD trackedSafe honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('health-canada-dpd', getHealthCanadaProductsByName('sinequan'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'health-canada-dpd')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('health-canada-dpd', getHealthCanadaProductsByName('sinequan'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'health-canada-dpd')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
