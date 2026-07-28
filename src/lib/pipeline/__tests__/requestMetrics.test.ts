import {
  clearRequestMetrics,
  getRequestMetrics,
  recordRequestMetric,
  snapshotRequestMetrics,
} from '@/lib/pipeline/requestMetrics'

describe('requestMetrics', () => {
  beforeEach(() => clearRequestMetrics())

  it('records and snapshots events', () => {
    recordRequestMetric('fetch', 'GET /api/x', { ms: 12, status: 200 })
    recordRequestMetric('fetch_err', 'POST /api/y', { detail: 'fail' })
    const snap = snapshotRequestMetrics()
    expect(snap.counts.fetch).toBe(1)
    expect(snap.counts.fetch_err).toBe(1)
    expect(snap.browserGate.max).toBeGreaterThan(0)
    expect(snap.categoryGate.max).toBeGreaterThan(0)
    expect(getRequestMetrics().length).toBe(2)
  })

  it('caps ring buffer', () => {
    for (let i = 0; i < 100; i++) {
      recordRequestMetric('fetch', `url-${i}`)
    }
    expect(getRequestMetrics().length).toBeLessThanOrEqual(80)
  })
})
