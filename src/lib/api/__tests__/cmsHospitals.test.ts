/**
 * @jest-environment node
 */

import { searchCmsHospitalsByName } from '../cmsHospitals'
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
      facility_id: '240010',
      facility_name: 'MAYO CLINIC HOSPITAL ROCHESTER',
      address: '1216 SECOND STREET SOUTHWEST',
      citytown: 'ROCHESTER',
      state: 'MN',
      zip_code: '55902',
      telephone_number: '(507) 255-5123',
      hospital_type: 'Acute Care Hospitals',
      hospital_ownership: 'Voluntary non-profit - Private',
      emergency_services: 'Yes',
      hospital_overall_rating: '5',
    },
  ],
}

describe('cmsHospitals', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  it('returns empty for short query without network', async () => {
    await expect(searchCmsHospitalsByName('a')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps CMS datastore rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(SAMPLE))
    const rows = await searchCmsHospitalsByName('mayo')
    expect(rows).toHaveLength(1)
    expect(rows[0].facilityName).toMatch(/MAYO/i)
    expect(rows[0].state).toBe('MN')
    expect(rows[0].careCompareUrl).toMatch(/medicare\.gov/)
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await searchCmsHospitalsByName('unknownxyz')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchCmsHospitalsByName('mayo')).toEqual([])
  })

  it('throws when datastore returns HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchCmsHospitalsByName('mayo')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchCmsHospitalsByName('mayo')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchCmsHospitalsByName('mayo')).rejects.toThrow(/network/)
  })
})

describe('CMS hospitals trackedSafe honesty', () => {
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
      trackedSafe('cms-hospitals', searchCmsHospitalsByName('mayo'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'cms-hospitals')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('cms-hospitals', searchCmsHospitalsByName('mayo'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'cms-hospitals')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
