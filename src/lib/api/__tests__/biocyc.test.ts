/**
 * @jest-environment node
 */

import { searchBioCyc, searchCompoundsInPathways } from '../biocyc'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

function xmlRes(body: string, status = 200, contentType = 'application/xml') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => ({}),
    text: async () => body,
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

const PATHWAY_XML = '<Pathway frameid="GLYCOLYSIS">\n  <Name>glycolysis I</Name>\n</Pathway>'
const EMPTY_XML = '<ptools-xml></ptools-xml>'
const COMPOUND_XML = '<Compound frameid="ASPIRIN"></Compound>'

describe('searchBioCyc', () => {
  it('returns empty for short query without network', async () => {
    await expect(searchBioCyc('a')).resolves.toEqual([])
    await expect(searchBioCyc('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps BioCyc pathway XML', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes(PATHWAY_XML))
    const rows = await searchBioCyc('aspirin', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].pathwayId).toBe('GLYCOLYSIS')
    expect(rows[0].name).toBe('glycolysis I')
    expect(rows[0].url).toContain('GLYCOLYSIS')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('biocyc.org')
  })

  it('zero-hit XML is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes(EMPTY_XML))
    expect(await searchBioCyc('unknownxyzbiocyc')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('', 404))
    expect(await searchBioCyc('aspirin')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('', 503))
    await expect(searchBioCyc('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchBioCyc('aspirin')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchBioCyc('aspirin')).rejects.toThrow(/network/)
  })
})

describe('searchCompoundsInPathways', () => {
  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('', 503))
    await expect(searchCompoundsInPathways('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('zero-hit XML is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes(EMPTY_XML))
    expect(await searchCompoundsInPathways('unknownxyzbiocyc')).toEqual([])
  })

  it('maps compound XML', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes(COMPOUND_XML))
    const rows = await searchCompoundsInPathways('aspirin', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].pathwayId).toBe('ASPIRIN')
  })
})

describe('BioCyc trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('', 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('biocyc', searchBioCyc('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'biocyc')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('', 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('biocyc', searchBioCyc('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'biocyc')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
