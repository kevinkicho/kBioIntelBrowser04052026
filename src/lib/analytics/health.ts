import { getDetailedApiMetrics } from './db'

export type SourceHealth = 'healthy' | 'slow' | 'errors' | 'unknown'

export interface HealthAssessment {
  status: SourceHealth
  reason: string
  p95_ms: number | null
  errors_last_hour: number
  consecutive_errors: number
  sample_size: number
}

const MIN_SAMPLES = 5
const ERRORS_LAST_HOUR_THRESHOLD = 3
const SLOW_P95_RATIO = 2

/**
 * Classify a source's recent health based on persisted analytics.
 * - errors  : >= 3 errors in the last hour OR currently in an error streak >= 3
 * - slow    : p95 over last 24h is more than 2x the lifetime p50 baseline
 * - healthy : everything else (with at least MIN_SAMPLES recent samples)
 * - unknown : not enough samples to judge
 */
export function healthFor(source: string): HealthAssessment {
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString()

  const recent = getDetailedApiMetrics(source, oneDayAgo)
  const lifetime = getDetailedApiMetrics(source)

  if (!recent || recent.total_requests < MIN_SAMPLES) {
    return {
      status: 'unknown',
      reason: 'insufficient samples',
      p95_ms: null,
      errors_last_hour: 0,
      consecutive_errors: 0,
      sample_size: recent?.total_requests ?? 0,
    }
  }

  const errorsLastHour = recent.recent_calls.filter(
    r => (r.status >= 400 || r.status === 0) && r.timestamp >= oneHourAgo,
  ).length

  if (errorsLastHour >= ERRORS_LAST_HOUR_THRESHOLD || recent.consecutive_errors >= 3) {
    return {
      status: 'errors',
      reason: `${errorsLastHour} errors in the last hour`,
      p95_ms: recent.p95_ms,
      errors_last_hour: errorsLastHour,
      consecutive_errors: recent.consecutive_errors,
      sample_size: recent.total_requests,
    }
  }

  const baseline = lifetime?.p50_ms ?? recent.p50_ms
  if (baseline > 0 && recent.p95_ms > baseline * SLOW_P95_RATIO) {
    return {
      status: 'slow',
      reason: `p95 ${recent.p95_ms}ms vs baseline p50 ${baseline}ms`,
      p95_ms: recent.p95_ms,
      errors_last_hour: errorsLastHour,
      consecutive_errors: recent.consecutive_errors,
      sample_size: recent.total_requests,
    }
  }

  return {
    status: 'healthy',
    reason: 'within expected range',
    p95_ms: recent.p95_ms,
    errors_last_hour: errorsLastHour,
    consecutive_errors: recent.consecutive_errors,
    sample_size: recent.total_requests,
  }
}
