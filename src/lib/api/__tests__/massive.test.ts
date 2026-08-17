/**
 * @jest-environment node
 */

import { searchMassive, getRecentDatasets } from '../massive'
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
  datasets: [
    {
      id: 'MSV000001',
      title: 'Aspirin proteomics',
      description: 'demo',
      doi: '',
      submitter: 'lab',
      submissionDate: '2026-01-01',
      updateDate: '2026-01-02',
      organism: 'Homo sapiens',
      instrumentType: 'Orbitrap',
      datasetType: 'Proteomics',
      sampleType: 'blood',
      lab: 'UCSD',
      contactName: '',
      contactEmail: '',
      fileCount: 3,
      fileSize: 100,
    },
  ],
  total: 1,
}

describe('searchMassive', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  it('returns empty for blank query without network', async () => {
    await expect(searchMassive('')).resolves.toEqual({ datasets: [], total: 0 })
    await expect(searchMassive('   ')).resolves.toEqual({ datasets: [], total: 0 })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps MassIVE search rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(SAMPLE))
    const result = await searchMassive('aspirin')
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0].id).toBe('MSV000001')
    expect(result.datasets[0].title).toBe('Aspirin proteomics')
    expect(result.total).toBe(1)
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ datasets: [], total: 0 }))
    expect(await searchMassive('unknownxyz')).toEqual({ datasets: [], total: 0 })
  })

  it('search 404 falls back to recent; recent 404 is EMPTY', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchMassive('aspirin')).toEqual({ datasets: [], total: 0 })
  })

  it('search 503 falls back to recent rows', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes(SAMPLE))
    const result = await searchMassive('aspirin')
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0].id).toBe('MSV000001')
  })

  it('throws when search and recent both return HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(searchMassive('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body when recent fallback also fails', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchMassive('aspirin')).rejects.toThrow(/HTML/)
  })

  it('throws on network error when recent fallback also fails', async () => {
    ;(fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
    await expect(searchMassive('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getRecentDatasets honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  it('throws on HTTP 503 (not empty-as-success)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getRecentDatasets()).rejects.toThrow(/HTTP 503/)
  })
})

describe('MassIVE trackedSafe honesty', () => {
  const prevFetch = global.fetch
  beforeEach(() => {
    resetRateLimitBuckets()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    global.fetch = prevFetch
  })

  test('HTTP 503 after fallback is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('massive', searchMassive('aspirin'), { datasets: [], total: 0 }),
    )
    expect(value).toEqual({ datasets: [], total: 0 })
    const row = metrics.find((m) => m.source === 'massive')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 after fallback is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('massive', searchMassive('aspirin'), { datasets: [], total: 0 }),
    )
    expect(value).toEqual({ datasets: [], total: 0 })
    const row = metrics.find((m) => m.source === 'massive')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
