/**
 * @jest-environment node
 */

import {
  getBiologicsLicensedByName,
  guessBiologicRole,
  looksLikeUsBiosimilarName,
  nonproprietaryCore,
} from '../biologicsLicensed'
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

const BLA_RESULTS = {
  results: [
    {
      application_number: 'BLA125057',
      sponsor_name: 'ABBVIE INC',
      submissions: [
        { submission_type: 'ORIG', submission_status_date: '20021231' },
      ],
      products: [
        {
          brand_name: 'HUMIRA',
          active_ingredients: [{ name: 'ADALIMUMAB', strength: '40MG/0.8ML' }],
          dosage_form: 'SYRINGE',
          marketing_status: 'Prescription',
        },
      ],
    },
    {
      application_number: 'BLA761024',
      sponsor_name: 'AMGEN INC',
      submissions: [
        { submission_type: 'ORIG', submission_status_date: '20160923' },
      ],
      products: [
        {
          brand_name: 'AMJEVITA',
          active_ingredients: [
            { name: 'ADALIMUMAB-ATTO', strength: '40MG/0.8ML' },
          ],
          dosage_form: 'SYRINGE',
          marketing_status: 'Prescription',
        },
      ],
    },
    {
      application_number: 'NDA021234',
      sponsor_name: 'NOT BIOLOGIC',
      products: [
        {
          brand_name: 'SMALLMOL',
          active_ingredients: [{ name: 'DRUGX' }],
        },
      ],
    },
  ],
}

describe('biologicsLicensed helpers', () => {
  it('detects US 4-letter biosimilar suffixes', () => {
    expect(looksLikeUsBiosimilarName('adalimumab-atto')).toBe(true)
    expect(looksLikeUsBiosimilarName('ADALIMUMAB-ADBM')).toBe(true)
    expect(looksLikeUsBiosimilarName('adalimumab')).toBe(false)
    expect(looksLikeUsBiosimilarName('tafamidis')).toBe(false)
  })

  it('extracts nonproprietary core', () => {
    expect(nonproprietaryCore('adalimumab-atto')).toBe('adalimumab')
    expect(nonproprietaryCore('adalimumab')).toBe('adalimumab')
  })

  it('guesses roles from family names', () => {
    const family = ['ADALIMUMAB', 'ADALIMUMAB-ATTO', 'ADALIMUMAB-ADBM']
    expect(guessBiologicRole('ADALIMUMAB-ATTO', family)).toBe('likely_biosimilar')
    expect(guessBiologicRole('ADALIMUMAB', family)).toBe('reference_or_originator')
    expect(guessBiologicRole('some-mab', ['some-mab'])).toBe('unknown')
  })
})

describe('getBiologicsLicensedByName', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  it('returns empty for short query', async () => {
    await expect(getBiologicsLicensedByName('a')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps BLA openFDA results and filters non-BLA', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes(BLA_RESULTS))

    const rows = await getBiologicsLicensedByName('adalimumab')
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.every((r) => r.applicationNumber.startsWith('BLA'))).toBe(true)
    const humira = rows.find((r) => r.brandName === 'HUMIRA')
    const amj = rows.find((r) => r.brandName === 'AMJEVITA')
    expect(humira?.sponsorName).toMatch(/ABBVIE/i)
    expect(humira?.roleGuess).toBe('reference_or_originator')
    expect(amj?.roleGuess).toBe('likely_biosimilar')
    expect(humira?.drugsAtFdaUrl).toMatch(/accessdata\.fda\.gov/)
    expect(humira?.approvalDate).toBe('2002-12-31')
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    await expect(getBiologicsLicensedByName('adalimumab')).resolves.toEqual([])
  })

  it('throws when both queries return HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getBiologicsLicensedByName('adalimumab')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getBiologicsLicensedByName('adalimumab')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getBiologicsLicensedByName('adalimumab')).rejects.toThrow(/network/)
  })
})

describe('biologics-licensed trackedSafe honesty', () => {
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
      trackedSafe('biologics-licensed', getBiologicsLicensedByName('adalimumab'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'biologics-licensed')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('biologics-licensed', getBiologicsLicensedByName('adalimumab'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'biologics-licensed')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
