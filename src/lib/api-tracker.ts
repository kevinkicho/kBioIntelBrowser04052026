import { withTimeout } from './utils'
import { payloadHasData } from './hasData'
import type { DataLoadStatus } from './dataStatus'
import { isApiSourceDisabled, getApiSourceDisabledReason } from './api/sourceAvailability'

export const perApiMetrics: Array<{
  source: string
  status: number
  duration_ms: number
  error?: string
  has_data: boolean
  loadStatus: DataLoadStatus
}> = []

export function trackedSafe<T>(
  source: string,
  promise: Promise<T>,
  fallback: T,
  timeout?: number
): Promise<T> {
  const start = Date.now()

  if (isApiSourceDisabled(source)) {
    perApiMetrics.push({
      source,
      status: 503,
      duration_ms: 0,
      error: getApiSourceDisabledReason(source) ?? 'Source disabled',
      has_data: false,
      loadStatus: 'disabled',
    })
    return Promise.resolve(fallback)
  }

  return withTimeout(promise, timeout)
    .then((val) => {
      const hasData = payloadHasData(val)
      perApiMetrics.push({
        source,
        status: 200,
        duration_ms: Date.now() - start,
        has_data: hasData,
        loadStatus: hasData ? 'loaded' : 'empty',
      })
      return val
    })
    .catch((err: unknown) => {
      const timedOut = err instanceof Error && err.message?.includes('timed out')
      perApiMetrics.push({
        source,
        status: timedOut ? 408 : 500,
        duration_ms: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
        has_data: false,
        loadStatus: timedOut ? 'timeout' : 'error',
      })
      return fallback
    })
}

export function flushApiMetrics(): typeof perApiMetrics {
  const metrics = [...perApiMetrics]
  perApiMetrics.length = 0
  return metrics
}

/** Build a panel-facing source status map from flushed metrics */
export function metricsToSourceStatus(
  metrics: typeof perApiMetrics,
): Record<string, { status: DataLoadStatus; error?: string; duration_ms: number; has_data: boolean }> {
  const out: Record<string, { status: DataLoadStatus; error?: string; duration_ms: number; has_data: boolean }> = {}
  for (const m of metrics) {
    out[m.source] = {
      status: m.loadStatus,
      error: m.error,
      duration_ms: m.duration_ms,
      has_data: m.has_data,
    }
  }
  return out
}
