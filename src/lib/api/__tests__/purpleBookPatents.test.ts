/**
 * @jest-environment node
 */

import {
  clearPurpleBookPatentMemoryCache,
  parsePurpleBookPatentHtml,
  searchPurpleBookPatentsByName,
  usptoPatentUrl,
} from '../purpleBookPatents'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

const SAMPLE = `
<table id="patentListTable">
  <thead><tr>
    <th>Reference Product BLA Number</th>
    <th>Applicant Name</th>
    <th>Proprietary Name</th>
    <th>Proper Name</th>
    <th>Patent Number</th>
    <th>Patent Expiration Date</th>
  </tr></thead>
  <tbody>
    <tr valign="top">
      <td>125057</td>
      <td>AbbVie Inc.</td>
      <td><a href="index.cfm?event=productdetails&blaNo=125057">Humira</a></td>
      <td>adalimumab</td>
      <td>11,083,792</td>
      <td>April 4, 2027</td>
    </tr>
    <tr valign="top">
      <td>125057</td>
      <td>AbbVie Inc.</td>
      <td>Humira</td>
      <td>adalimumab</td>
      <td>8,916,153</td>
      <td>April 4, 2027</td>
    </tr>
    <tr valign="top">
      <td>103705</td>
      <td>Genentech, Inc.</td>
      <td>Rituxan</td>
      <td>rituximab</td>
      <td>8,512,983</td>
      <td>January 4, 2031</td>
    </tr>
  </tbody>
</table>
`

describe('purpleBookPatents', () => {
  beforeEach(() => clearPurpleBookPatentMemoryCache())

  it('parses BPPT table rows and normalizes BLA / patent numbers', () => {
    const rows = parsePurpleBookPatentHtml(SAMPLE)
    expect(rows).toHaveLength(3)
    const humira = rows.filter((r) => r.properName === 'adalimumab')
    expect(humira).toHaveLength(2)
    expect(humira[0].blaNumber).toBe('BLA125057')
    expect(humira[0].patentNumber).toBe('11083792')
    expect(humira[0].patentExpirationDate).toMatch(/2027/)
    expect(humira[0].googlePatentsUrl).toMatch(/patents\.google\.com/)
    expect(usptoPatentUrl('11,083,792')).toMatch(/11083792/)
  })
})

function htmlRes(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'text/html' : null) },
    text: async () => body,
    json: async () => ({}),
  }
}

describe('searchPurpleBookPatentsByName honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    clearPurpleBookPatentMemoryCache()
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
    clearPurpleBookPatentMemoryCache()
  })

  it('returns empty for short query without network', async () => {
    await expect(searchPurpleBookPatentsByName('a')).resolves.toEqual({ meta: null, patents: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps live HTML catalog rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(htmlRes(SAMPLE.padEnd(600, ' ')))
    const result = await searchPurpleBookPatentsByName('adalimumab')
    expect(result.patents.length).toBeGreaterThan(0)
    expect(result.patents[0].properName).toBe('adalimumab')
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(htmlRes('', 404))
    expect(await searchPurpleBookPatentsByName('adalimumab')).toEqual({ meta: null, patents: [] })
  })

  it('throws when patent-list returns HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(htmlRes('upstream', 503))
    await expect(searchPurpleBookPatentsByName('adalimumab')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchPurpleBookPatentsByName('adalimumab')).rejects.toThrow(/network/)
  })
})

describe('Purple Book patents trackedSafe honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    clearPurpleBookPatentMemoryCache()
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
    clearPurpleBookPatentMemoryCache()
  })

  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(htmlRes('upstream', 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('purple-book-patents', searchPurpleBookPatentsByName('adalimumab'), { meta: null, patents: [] }),
    )
    expect(value).toEqual({ meta: null, patents: [] })
    const row = metrics.find((m) => m.source === 'purple-book-patents')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(htmlRes('', 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('purple-book-patents', searchPurpleBookPatentsByName('adalimumab'), { meta: null, patents: [] }),
    )
    expect(value).toEqual({ meta: null, patents: [] })
    const row = metrics.find((m) => m.source === 'purple-book-patents')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})