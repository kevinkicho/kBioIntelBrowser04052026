/**
 * @jest-environment node
 */

import { searchRorOrganizations, resolveRorByNames } from '../ror'
import { metricsToSourceStatus, runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { sourceStatusForPanel } from '@/lib/panelApiTrace'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const mayoItem = {
  id: 'https://ror.org/02qp3tb03',
  status: 'active',
  types: ['healthcare', 'funder'],
  established: 1889,
  names: [
    { value: 'Mayo Clinic', types: ['ror_display', 'label'], lang: 'en' },
    { value: 'Mayo', types: ['alias'], lang: 'en' },
  ],
  links: [
    { type: 'website', value: 'https://www.mayoclinic.org' },
    { type: 'wikipedia', value: 'https://en.wikipedia.org/wiki/Mayo_Clinic' },
  ],
  locations: [
    {
      geonames_details: {
        country_code: 'US',
        country_name: 'United States',
        country_subdivision_name: 'Minnesota',
        name: 'Rochester',
      },
    },
  ],
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('searchRorOrganizations', () => {
  it('returns empty for short query without fetch', async () => {
    await expect(searchRorOrganizations('a')).resolves.toEqual([])
    await expect(searchRorOrganizations('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps ROR v2 organization JSON', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ number_of_results: 1, items: [mayoItem] }))
    const rows = await searchRorOrganizations('Mayo Clinic')
    expect(rows).toHaveLength(1)
    expect(rows[0].rorId).toBe('02qp3tb03')
    expect(rows[0].name).toBe('Mayo Clinic')
    expect(rows[0].types).toContain('healthcare')
    expect(rows[0].countryCode).toBe('US')
    expect(rows[0].website).toMatch(/mayoclinic/)
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ number_of_results: 0, items: [] }))
    expect(await searchRorOrganizations('unknownxyzorg')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchRorOrganizations('Mayo Clinic')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchRorOrganizations('Mayo Clinic')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchRorOrganizations('Mayo Clinic')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchRorOrganizations('Mayo Clinic')).rejects.toThrow(/network/)
  })
})

describe('resolveRorByNames', () => {
  it('propagates HTTP 503 so Discover cannot treat failure as empty', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(resolveRorByNames(['Mayo Clinic'])).rejects.toThrow(/HTTP 503/)
  })
})

describe('ROR trackedSafe honesty', () => {
  test('ror-eu-pack HTTP 503 maps to eu-research-orgs so hideEmpty cannot hide ERROR', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ror-eu-pack', searchRorOrganizations('Mayo Clinic'), []),
    )
    expect(value).toEqual([])
    expect(sourceStatusForPanel(metricsToSourceStatus(metrics), 'eu-research-orgs')?.status).toBe('error')
  })

  test('ror-query HTTP 503 maps to research-orgs so hideEmpty cannot hide ERROR', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ror-query', searchRorOrganizations('Mayo Clinic'), []),
    )
    expect(value).toEqual([])
    expect(sourceStatusForPanel(metricsToSourceStatus(metrics), 'research-orgs')?.status).toBe('error')
  })
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ror-lit-query', searchRorOrganizations('Mayo Clinic'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'ror-lit-query')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
    expect(sourceStatusForPanel(metricsToSourceStatus(metrics), 'research-orgs-lit')?.status).toBe('error')
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ror-lit-query', searchRorOrganizations('Mayo Clinic'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'ror-lit-query')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
