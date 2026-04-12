import { withTimeout } from './utils'

export const perApiMetrics: Array<{
  source: string
  status: number
  duration_ms: number
  error?: string
  has_data: boolean
}> = []

export function trackedSafe<T>(
  source: string,
  promise: Promise<T>,
  fallback: T,
  timeout?: number
): Promise<T> {
  const start = Date.now()
  return withTimeout(promise, timeout)
    .then((val) => {
      const hasData = val !== null && val !== undefined && (Array.isArray(val) ? val.length > 0 : true)
      perApiMetrics.push({
        source,
        status: 200,
        duration_ms: Date.now() - start,
        has_data: hasData,
      })
      return val
    })
    .catch((err: unknown) => {
      perApiMetrics.push({
        source,
        status: err instanceof Error && err.message?.includes('timed out') ? 408 : 500,
        duration_ms: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
        has_data: false,
      })
      return fallback
    })
}

export function flushApiMetrics(): typeof perApiMetrics {
  const metrics = [...perApiMetrics]
  perApiMetrics.length = 0
  return metrics
}