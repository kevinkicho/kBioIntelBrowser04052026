import { AsyncLocalStorage } from 'async_hooks'
import { withTimeout } from './utils'
import { payloadHasData } from './hasData'
import type { DataLoadStatus } from './dataStatus'
import { isApiSourceDisabled, getApiSourceDisabledReason } from './api/sourceAvailability'

export type ApiMetric = {
  source: string
  status: number
  duration_ms: number
  error?: string
  has_data: boolean
  loadStatus: DataLoadStatus
}

/**
 * Request-scoped metrics bag.
 *
 * CRITICAL: never use a process-global array alone — concurrent category
 * fetches on the same Node process would interleave and flush each other's
 * timeouts/errors, so UI cards show false "error/timeout" until a lone refresh.
 */
type MetricsStore = { metrics: ApiMetric[] }

const metricsAls = new AsyncLocalStorage<MetricsStore>()

/** @deprecated Prefer runWithApiMetrics — exposed for tests that push directly. */
export const perApiMetrics: ApiMetric[] = []

function metricsBucket(): ApiMetric[] {
  return metricsAls.getStore()?.metrics ?? perApiMetrics
}

/**
 * Run async work with an isolated metrics bag. Category routes must wrap
 * fetchers in this so concurrent /category/* requests do not cross-contaminate.
 */
export async function runWithApiMetrics<T>(fn: () => Promise<T>): Promise<{
  value: T
  metrics: ApiMetric[]
}> {
  const store: MetricsStore = { metrics: [] }
  return metricsAls.run(store, async () => {
    try {
      const value = await fn()
      return { value, metrics: flushApiMetrics() }
    } catch (err) {
      // Still return flushed metrics on the error object path via rethrow after flush
      const metrics = flushApiMetrics()
      ;(err as { __apiMetrics?: ApiMetric[] }).__apiMetrics = metrics
      throw err
    }
  })
}

export function trackedSafe<T>(
  source: string,
  promise: Promise<T>,
  fallback: T,
  timeout?: number,
): Promise<T> {
  const start = Date.now()
  const bucket = metricsBucket()

  if (isApiSourceDisabled(source)) {
    bucket.push({
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
      bucket.push({
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
      bucket.push({
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

export function flushApiMetrics(): ApiMetric[] {
  const bucket = metricsBucket()
  const metrics = [...bucket]
  bucket.length = 0
  return metrics
}

/** Build a panel-facing source status map from flushed metrics */
export function metricsToSourceStatus(
  metrics: ApiMetric[],
): Record<string, { status: DataLoadStatus; error?: string; duration_ms: number; has_data: boolean }> {
  const out: Record<
    string,
    { status: DataLoadStatus; error?: string; duration_ms: number; has_data: boolean }
  > = {}
  for (const m of metrics) {
    // Prefer worst status if the same source is recorded twice (defensive)
    const prev = out[m.source]
    if (!prev) {
      out[m.source] = {
        status: m.loadStatus,
        error: m.error,
        duration_ms: m.duration_ms,
        has_data: m.has_data,
      }
      continue
    }
    const rank = (s: DataLoadStatus) =>
      (({ timeout: 0, error: 1, disabled: 2, empty: 3, loaded: 4 } as Record<DataLoadStatus, number>)[
        s
      ] ?? 9)
    if (rank(m.loadStatus) < rank(prev.status)) {
      out[m.source] = {
        status: m.loadStatus,
        error: m.error,
        duration_ms: m.duration_ms,
        has_data: m.has_data,
      }
    }
  }
  return out
}
