const IS_DEV = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

function logFetchOutcome(
  url: string,
  method: string,
  status: number,
  duration: number,
  ok: boolean,
): void {
  if (!IS_DEV) return
  try {
    // Lazy to keep clientFetch usable in edge cases without circular init
    void import('./agentActivityLog').then(({ logAgentActivity }) => {
      logAgentActivity(
        ok ? 'fetch.ok' : 'fetch.err',
        { url: url.slice(0, 200), method, status, ms: duration },
        { source: 'clientFetch', level: ok ? 'debug' : 'warn' },
      )
    })
  } catch {
    /* ignore */
  }
}

const LOG_STYLE = 'color: #60a5fa; font-weight: bold'
const OK_STYLE = 'color: #34d399'
const ERR_STYLE = 'color: #f87171'
const DIM_STYLE = 'color: #94a3b8'
const TIME_STYLE = 'color: #fbbf24'

function ms(duration: number): string {
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(1)}s`
}

const inFlight = new Map<string, { promise: Promise<Response>; addedAt: number }>()
const INFLIGHT_MAX_AGE_MS = 60_000
const INFLIGHT_MAX_SIZE = 500

function getKey(input: RequestInfo | URL, init?: RequestInit): string {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const method = init?.method || 'GET'
  return `${method}:${url}`
}

const analyticsQueue: Array<Record<string, unknown>> = []
let analyticsFlushTimer: ReturnType<typeof setTimeout> | null = null

function flushAnalytics() {
  if (analyticsQueue.length === 0) return
  const batch = analyticsQueue.splice(0, analyticsQueue.length)
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  }).catch(() => {})
}

function enqueueMetric(metric: Record<string, unknown>) {
  analyticsQueue.push(metric)
  if (!analyticsFlushTimer) {
    analyticsFlushTimer = setTimeout(() => {
      analyticsFlushTimer = null
      flushAnalytics()
    }, 5000)
  }
}

/** Status codes worth retrying (HMR race 404s, rate limits, flaky upstream). */
const DEFAULT_RETRY_STATUSES = new Set([404, 429, 500, 502, 503])

export interface ClientFetchOptions {
  /**
   * Extra attempts after the first try. Shared with in-flight dedupe waiters
   * so concurrent callers benefit from the same retry chain.
   */
  retries?: number
  /** Base delay in ms before first retry (exponential + jitter). Default 350. */
  retryDelayMs?: number
  /** Override which HTTP statuses trigger a retry. */
  retryStatuses?: number[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetryStatus(status: number, retryStatuses: Set<number>): boolean {
  return retryStatuses.has(status)
}

function metricSource(url: string): string | null {
  if (url.includes('/category/')) return null
  if (url.includes('/panel/')) {
    return 'panel:' + url.split('/panel/')[1]?.split('/')[0]?.split('?')[0]
  }
  if (url.includes('/search')) return 'search'
  if (url.includes('/similar')) return 'similar'
  if (url.includes('/pipeline')) return 'pipeline'
  return url
}

/**
 * Browser fetch with GET dedupe, optional retries, and dev logging.
 * Use `retries` for profile/category/pipeline loads that race Fast Refresh
 * or transient PubChem/upstream failures.
 */
export async function clientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: ClientFetchOptions,
): Promise<Response> {
  const retries = Math.max(0, options?.retries ?? 0)
  const retryDelayMs = options?.retryDelayMs ?? 350
  const retryStatuses = new Set(options?.retryStatuses ?? DEFAULT_RETRY_STATUSES)
  const maxAttempts = 1 + retries

  const key = getKey(input, init)
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const method = init?.method || 'GET'
  const isDedupable = !init?.method || init.method === 'GET'

  if (isDedupable) {
    const existing = inFlight.get(key)
    if (existing) {
      if (IS_DEV) console.log(`%c↑ dedupe %c${method} %c${url}`, DIM_STYLE, LOG_STYLE, DIM_STYLE)
      const res = await existing.promise
      return res.clone()
    }
  }

  const start = performance.now()
  if (IS_DEV) console.group(`%c→ ${method} %c${url}`, LOG_STYLE, DIM_STYLE)

  const promise = (async (): Promise<Response> => {
    let lastError: unknown
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(input, init)
        if (
          response.ok ||
          attempt === maxAttempts - 1 ||
          !shouldRetryStatus(response.status, retryStatuses)
        ) {
          return response
        }
        if (IS_DEV) {
          console.warn(
            `%c↻ retry ${attempt + 1}/${retries} after ${response.status}`,
            ERR_STYLE,
          )
        }
        // Drain body so the connection can close cleanly before retry
        await response.arrayBuffer().catch(() => {})
        await sleep(retryDelayMs * 2 ** attempt + Math.random() * 150)
      } catch (error) {
        lastError = error
        if (attempt === maxAttempts - 1) throw error
        if (IS_DEV) {
          console.warn(
            `%c↻ retry ${attempt + 1}/${retries} after network error`,
            ERR_STYLE,
          )
        }
        await sleep(retryDelayMs * 2 ** attempt + Math.random() * 150)
      }
    }
    throw lastError instanceof Error ? lastError : new Error('clientFetch failed')
  })().finally(() => {
    if (isDedupable) {
      inFlight.delete(key)
    }
  })

  if (isDedupable) {
    if (inFlight.size > INFLIGHT_MAX_SIZE) {
      const now = Date.now()
      inFlight.forEach((v, k) => {
        if (now - v.addedAt > INFLIGHT_MAX_AGE_MS) inFlight.delete(k)
      })
    }
    inFlight.set(key, { promise, addedAt: Date.now() })
  }

  try {
    const response = await promise
    const duration = Math.round(performance.now() - start)
    const size = response.headers?.get?.('content-length')
    const sizeStr = size ? ` ${Math.round(parseInt(size) / 1024)}KB` : ''

    const source = metricSource(url)

    if (source) {
      enqueueMetric({
        source,
        endpoint: url,
        status: response.status,
        duration_ms: duration,
        has_data: response.ok,
      })
    }

    logFetchOutcome(url, method, response.status, duration, response.ok)
    if (response.ok) {
      if (IS_DEV) console.log(
        `%c← ${response.status} %c${ms(duration)}%c${sizeStr}`,
        OK_STYLE, TIME_STYLE, DIM_STYLE,
      )
    } else {
      if (IS_DEV) console.warn(
        `%c← ${response.status} ${response.statusText} %c${ms(duration)}`,
        ERR_STYLE, TIME_STYLE,
      )
    }
    if (IS_DEV) console.groupEnd()
    return response
  } catch (error) {
    const duration = Math.round(performance.now() - start)

    const source = metricSource(url)

    if (source) {
      enqueueMetric({
        source,
        endpoint: url,
        status: 0,
        duration_ms: duration,
        error: error instanceof Error ? error.message : String(error),
        has_data: false,
      })
    }

    logFetchOutcome(url, method, 0, duration, false)
    if (IS_DEV) console.error(
      `%c✗ Network error %c${ms(duration)}`,
      ERR_STYLE, TIME_STYLE,
      error,
    )
    if (IS_DEV) console.groupEnd()
    throw error
  }
}