/**
 * @jest-environment node
 */

import { searchMassBank, getMassBankSpectrum } from '../massbank'
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

const record = {
  accession: 'MSBNK-001',
  compound: { names: ['Caffeine'], formula: 'C8H10N4O2', mass: 194.08 },
  acquisition: {
    instrument: 'QTOF',
    mass_spectrometry: { ion_mode: 'POSITIVE', ms_type: 'MS2', precursor_mz: '195.087' },
  },
}

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

describe('searchMassBank', () => {
  it('returns empty for blank query without network', async () => {
    await expect(searchMassBank('')).resolves.toEqual([])
    await expect(searchMassBank('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps MassBank records', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([record]))
    const rows = await searchMassBank('caffeine')
    expect(rows).toHaveLength(1)
    expect(rows[0].accession).toBe('MSBNK-001')
    expect(rows[0].name).toBe('Caffeine')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('massbank.eu')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([]))
    expect(await searchMassBank('unknownxyzmb')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchMassBank('caffeine')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchMassBank('caffeine')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchMassBank('caffeine')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchMassBank('caffeine')).rejects.toThrow(/network/)
  })
})

describe('getMassBankSpectrum', () => {
  it('throws on HTTP 503 (not null-as-empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getMassBankSpectrum('MSBNK-001')).rejects.toThrow(/HTTP 503/)
  })

  it('404 is null (true empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getMassBankSpectrum('MISSING')).toBeNull()
  })
})

describe('MassBank trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('massbank', searchMassBank('caffeine'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'massbank')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('massbank', searchMassBank('caffeine'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'massbank')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
