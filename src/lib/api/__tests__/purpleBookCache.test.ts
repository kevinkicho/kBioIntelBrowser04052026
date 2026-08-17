/**
 * @jest-environment node
 */

import {
  clearPurpleBookMemoryCache,
  isPurpleBookBiosimilarLicense,
  isPurpleBookInterchangeableLicense,
  parsePurpleBookCsv,
  purpleBookCandidateMonths,
  purpleBookCsvUrl,
  searchPurpleBookByName,
  setPurpleBookTestMonthCount,
} from '../purpleBookCache'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

const SAMPLE = `Purple Book Monthly Historical Data Changes Report - June 2026,,,,,,,,
,,,,,,,,
N/R/U,Applicant,BLA Number,Proprietary Name,Proper Name,License Type,Strength,Dosage Form,Route of Administration,Product Presentation,Marketing Status,Licensure,Approval Date,Inter. Approval Date,Ref. Product Proper Name,Ref. Product Proprietary Name,Supplement Number,Submission Type,Inter. Supplement Number,License Number,Product Number,Center,Date of First Licensure,Exclusivity Expiration Date,First Interchangeable Exclusivity Exp. Date,Ref. Product Exclusivity Exp. Date,Orphan Exclusivity Exp. Date,Patent List Provided
,AbbVie Inc.,125057,Humira,adalimumab,351(a),40MG/0.8ML,Injection,Subcutaneous,Autoinjector,Rx,Licensed,31-Dec-02,,N/A,N/A,,Original,,1889,001,CDER,,,,,24-Feb-28,YES
,Amgen Inc.,761024,Amjevita,adalimumab-atto,351(k) Interchangeable,40MG/0.8ML,Injection,Subcutaneous,Pre-Filled Syringe,Rx,Licensed,23-Sep-16,20-Aug-24,adalimumab,Humira,,Original,19,1080,002,CDER,,,,,,
N,Accord BioPharma Inc.,761027,Filkri,filgrastim-laha,351(k) Biosimilar,300MCG/0.5ML,Injection,Subcutaneous,Pre-Filled Syringe,Rx,Licensed,15-Jan-26,,filgrastim,Neupogen,,Original,,2105,001,CDER,,,,,,
`

function csvRes(body: string, status = 200, contentType = 'text/csv') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
    json: async () => ({}),
  }
}

describe('purpleBookCache', () => {
  beforeEach(() => clearPurpleBookMemoryCache())

  it('builds candidate months newest-first', () => {
    const c = purpleBookCandidateMonths(new Date('2026-06-15T00:00:00Z'), 3)
    expect(c[0]).toEqual({ year: 2026, month: 'june' })
    expect(c[1].month).toBe('may')
    expect(purpleBookCsvUrl(2026, 'june')).toMatch(/purplebook-search-june-data-download\.csv/)
  })

  it('parses official license types and BLA numbers', () => {
    const cat = parsePurpleBookCsv(SAMPLE, '2026-06', 'https://example.test/pb.csv')
    expect(cat.products.length).toBe(3)
    const humira = cat.products.find((p) => p.proprietaryName === 'Humira')
    const amj = cat.products.find((p) => p.proprietaryName === 'Amjevita')
    expect(humira?.blaNumber).toBe('BLA125057')
    expect(humira?.licenseType).toBe('351(a)')
    expect(amj?.licenseType).toMatch(/Interchangeable/i)
    expect(amj?.refProductProprietaryName).toBe('Humira')
    expect(isPurpleBookBiosimilarLicense(amj!.licenseType)).toBe(true)
    expect(isPurpleBookInterchangeableLicense(amj!.licenseType)).toBe(true)
    expect(isPurpleBookBiosimilarLicense('351(a)')).toBe(false)
  })
})

describe('searchPurpleBookByName honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    clearPurpleBookMemoryCache()
    setPurpleBookTestMonthCount(2)
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
    clearPurpleBookMemoryCache()
    setPurpleBookTestMonthCount(undefined)
  })

  it('returns empty for short query without network', async () => {
    await expect(searchPurpleBookByName('a')).resolves.toEqual({ meta: null, products: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps live CSV catalog rows after a 503 month fallback', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(csvRes('upstream', 503))
      .mockResolvedValueOnce(csvRes(SAMPLE.padEnd(250, ' ')))
    const result = await searchPurpleBookByName('adalimumab')
    expect(result.products.length).toBeGreaterThan(0)
    expect(result.products.some((p) => p.properName === 'adalimumab')).toBe(true)
  })

  it('zero-hit on a live catalog is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(csvRes(SAMPLE.padEnd(250, ' ')))
    const result = await searchPurpleBookByName('unknownxyzmolecule')
    expect(result.products).toEqual([])
    expect(result.meta).not.toBeNull()
  })

  it('all month URLs 404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(csvRes('', 404))
    expect(await searchPurpleBookByName('adalimumab')).toEqual({ meta: null, products: [] })
  })

  it('throws when every month URL returns HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(csvRes('upstream', 503))
    await expect(searchPurpleBookByName('adalimumab')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body when every month fallback also fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(csvRes('<html>nope</html>'.padEnd(250, ' '), 200, 'text/html'))
    await expect(searchPurpleBookByName('adalimumab')).rejects.toThrow(/HTML|non-CSV/)
  })

  it('throws on network error when every month fallback also fails', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(searchPurpleBookByName('adalimumab')).rejects.toThrow(/network/)
  })
})

describe('Purple Book trackedSafe honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    clearPurpleBookMemoryCache()
    setPurpleBookTestMonthCount(2)
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
    clearPurpleBookMemoryCache()
    setPurpleBookTestMonthCount(undefined)
  })

  test('HTTP 503 after all month fallbacks is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(csvRes('upstream', 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('purple-book', searchPurpleBookByName('adalimumab'), { meta: null, products: [] }),
    )
    expect(value).toEqual({ meta: null, products: [] })
    const row = metrics.find((m) => m.source === 'purple-book')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 after all month fallbacks is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(csvRes('', 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('purple-book', searchPurpleBookByName('adalimumab'), { meta: null, products: [] }),
    )
    expect(value).toEqual({ meta: null, products: [] })
    const row = metrics.find((m) => m.source === 'purple-book')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
