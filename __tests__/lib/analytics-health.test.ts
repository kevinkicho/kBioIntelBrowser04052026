import { healthFor } from '@/lib/analytics/health'
import * as db from '@/lib/analytics/db'

jest.mock('@/lib/analytics/db')

const mockedDb = db as jest.Mocked<typeof db>

function makeMetrics(opts: {
  total?: number
  p50?: number
  p95?: number
  consecutiveErrors?: number
  recentCalls?: Array<{ status: number; timestamp: string }>
}) {
  return {
    source: 'test',
    category: null,
    total_requests: opts.total ?? 100,
    success_count: 95,
    error_count: 5,
    empty_count: 0,
    success_rate: 95,
    avg_duration_ms: 200,
    p50_ms: opts.p50 ?? 200,
    p95_ms: opts.p95 ?? 400,
    p99_ms: 600,
    min_ms: 50,
    max_ms: 800,
    consecutive_errors: opts.consecutiveErrors ?? 0,
    consecutive_successes: 10,
    first_seen: '2026-04-01T00:00:00Z',
    last_seen: '2026-04-25T00:00:00Z',
    status_codes: [],
    top_errors: [],
    hourly_distribution: [],
    daily_trend: [],
    recent_calls: (opts.recentCalls ?? []).map((r, i) => ({
      id: i,
      source: 'test',
      endpoint: '',
      status: r.status,
      duration_ms: 200,
      error: null,
      has_data: 1,
      items_count: null,
      timestamp: r.timestamp,
    })),
  }
}

describe('healthFor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns unknown when sample size is below threshold', () => {
    mockedDb.getDetailedApiMetrics.mockReturnValue(makeMetrics({ total: 2 }))
    const result = healthFor('low-volume-source')
    expect(result.status).toBe('unknown')
    expect(result.sample_size).toBe(2)
  })

  test('returns errors when 3+ errors in last hour', () => {
    const now = Date.now()
    const halfHourAgo = new Date(now - 30 * 60_000).toISOString()
    mockedDb.getDetailedApiMetrics.mockReturnValue(makeMetrics({
      total: 50,
      recentCalls: [
        { status: 500, timestamp: halfHourAgo },
        { status: 500, timestamp: halfHourAgo },
        { status: 500, timestamp: halfHourAgo },
        { status: 200, timestamp: halfHourAgo },
      ],
    }))
    const result = healthFor('flaky-source')
    expect(result.status).toBe('errors')
    expect(result.errors_last_hour).toBe(3)
  })

  test('returns errors on consecutive error streak >= 3', () => {
    mockedDb.getDetailedApiMetrics.mockReturnValue(makeMetrics({
      total: 50,
      consecutiveErrors: 4,
    }))
    const result = healthFor('streaking-source')
    expect(result.status).toBe('errors')
    expect(result.consecutive_errors).toBe(4)
  })

  test('returns slow when p95 is >2x baseline p50', () => {
    mockedDb.getDetailedApiMetrics
      .mockReturnValueOnce(makeMetrics({ total: 50, p50: 250, p95: 600 }))   // recent (24h)
      .mockReturnValueOnce(makeMetrics({ total: 1000, p50: 200 }))           // lifetime
    const result = healthFor('slow-source')
    expect(result.status).toBe('slow')
    expect(result.p95_ms).toBe(600)
  })

  test('returns healthy when within expected range', () => {
    mockedDb.getDetailedApiMetrics
      .mockReturnValueOnce(makeMetrics({ total: 50, p50: 200, p95: 350 }))
      .mockReturnValueOnce(makeMetrics({ total: 1000, p50: 200 }))
    const result = healthFor('healthy-source')
    expect(result.status).toBe('healthy')
  })

  test('does not flag slow when baseline p50 is 0', () => {
    mockedDb.getDetailedApiMetrics
      .mockReturnValueOnce(makeMetrics({ total: 50, p50: 0, p95: 5000 }))
      .mockReturnValueOnce(makeMetrics({ total: 1000, p50: 0 }))
    const result = healthFor('zero-baseline-source')
    expect(result.status).toBe('healthy')
  })
})
