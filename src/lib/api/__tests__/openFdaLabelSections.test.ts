/**
 * @jest-environment node
 */

import { getOpenFdaLabelSectionsByName } from '../openFdaLabelSections'
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

const SAMPLE = {
  results: [
    {
      id: 'label-1',
      openfda: {
        brand_name: ['VIREAD'],
        generic_name: ['TENOFOVIR DISOPROXIL FUMARATE'],
        manufacturer_name: ['Gilead Sciences, Inc.'],
        spl_set_id: ['abc-set-id'],
      },
      boxed_warning: ['Lactic acidosis and severe hepatomegaly with steatosis…'],
      indications_and_usage: ['Indicated for HIV-1 infection in combination with other agents.'],
      adverse_reactions: ['Most common adverse reactions include rash and diarrhea.'],
    },
  ],
}

describe('openFdaLabelSections', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  it('returns empty for short query without network', async () => {
    await expect(getOpenFdaLabelSectionsByName('a')).resolves.toEqual([])
    await expect(getOpenFdaLabelSectionsByName('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps label sections and DailyMed setid link', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(SAMPLE))
    const rows = await getOpenFdaLabelSectionsByName('viread', 3)
    expect(rows).toHaveLength(1)
    expect(rows[0].brandName).toBe('VIREAD')
    expect(rows[0].setId).toBe('abc-set-id')
    expect(rows[0].dailyMedUrl).toContain('setid=abc-set-id')
    const keys = rows[0].sections.map((s) => s.key)
    expect(keys).toContain('boxed_warning')
    expect(keys).toContain('indications_and_usage')
    expect(keys).toContain('adverse_reactions')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('+OR+')
  })

  it('skips records with no extractable sections', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({ results: [{ id: 'empty', openfda: { brand_name: ['X'] } }] }),
    )
    await expect(getOpenFdaLabelSectionsByName('xdrug')).resolves.toEqual([])
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    await expect(getOpenFdaLabelSectionsByName('unknownxyz')).resolves.toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    await expect(getOpenFdaLabelSectionsByName('viread')).resolves.toEqual([])
  })

  it('throws when openFDA returns HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getOpenFdaLabelSectionsByName('viread')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getOpenFdaLabelSectionsByName('viread')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getOpenFdaLabelSectionsByName('viread')).rejects.toThrow(/network/)
  })
})

describe('openFDA labels trackedSafe honesty', () => {
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
      trackedSafe('openfda-labels', getOpenFdaLabelSectionsByName('viread'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'openfda-labels')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('openfda-labels', getOpenFdaLabelSectionsByName('viread'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'openfda-labels')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
