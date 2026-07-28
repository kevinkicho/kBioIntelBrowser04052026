import {
  isInsufficientResourcesError,
  markResourcePressure,
  singleFlightKey,
  underResourcePressure,
  withRequestSlot,
  withSingleFlight,
} from './requestProtocol'

const IS_DEV = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

/** Hard ceiling so hung TCP cannot pin the in-flight dedupe map forever. */
export const DEFAULT_CLIENT_FETCH_TIMEOUT_MS = 40_000

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
const ANALYTICS_FLUSH_MS = 4000
const ANALYTICS_MAX_QUEUE = 80

function flushAnalytics() {
  if (analyticsQueue.length === 0) return
  // Under socket pressure: drop metrics entirely (local product queue still holds events)
  if (underResourcePressure()) {
    analyticsQueue.length = 0
    return
  }
  const batch = analyticsQueue.splice(0, analyticsQueue.length)
  void withRequestSlot(
    () =>
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
        keepalive: true,
      }),
    { dropIfBusy: true, timeoutMs: 2000 },
  ).catch(() => {})
}

function enqueueMetric(metric: Record<string, unknown>) {
  if (underResourcePressure()) return
  if (analyticsQueue.length >= ANALYTICS_MAX_QUEUE) {
    analyticsQueue.splice(0, analyticsQueue.length - ANALYTICS_MAX_QUEUE + 1)
  }
  analyticsQueue.push(metric)
  if (!analyticsFlushTimer) {
    analyticsFlushTimer = setTimeout(() => {
      analyticsFlushTimer = null
      flushAnalytics()
    }, ANALYTICS_FLUSH_MS)
  }
}

/** Flush pending clientFetch metrics (pagehide / tests). */
export function flushClientFetchAnalytics(): void {
  if (analyticsFlushTimer) {
    clearTimeout(analyticsFlushTimer)
    analyticsFlushTimer = null
  }
  flushAnalytics()
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
  /**
   * Hard wall-clock timeout for the whole attempt chain (including retries).
   * Default 40s. Pass `0` to disable.
   */
  timeoutMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetryStatus(status: number, retryStatuses: Set<number>): boolean {
  return retryStatuses.has(status)
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

/**
 * Combine caller AbortSignal with an internal timeout controller.
 * Aborting either aborts the merged signal.
 */
function mergeAbortSignals(
  external: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const timeoutController = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      timeoutController.abort(
        new DOMException(`Request timed out after ${timeoutMs}ms`, 'AbortError'),
      )
    }, timeoutMs)
  }

  if (!external) {
    return {
      signal: timeoutController.signal,
      cleanup: () => {
        if (timer) clearTimeout(timer)
      },
    }
  }

  if (external.aborted) {
    if (timer) clearTimeout(timer)
    return { signal: external, cleanup: () => {} }
  }

  const merged = new AbortController()
  const onEither = () => {
    if (!merged.signal.aborted) {
      const reason =
        external.aborted
          ? external.reason
          : timeoutController.signal.reason
      try {
        merged.abort(reason)
      } catch {
        merged.abort()
      }
    }
  }
  external.addEventListener('abort', onEither, { once: true })
  timeoutController.signal.addEventListener('abort', onEither, { once: true })

  return {
    signal: merged.signal,
    cleanup: () => {
      if (timer) clearTimeout(timer)
      external.removeEventListener('abort', onEither)
      timeoutController.signal.removeEventListener('abort', onEither)
    },
  }
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
 * Browser fetch with GET dedupe, optional retries, hard timeout, and dev logging.
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
  const timeoutMs =
    options?.timeoutMs === undefined
      ? DEFAULT_CLIENT_FETCH_TIMEOUT_MS
      : Math.max(0, options.timeoutMs)

  const key = getKey(input, init)
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const method = init?.method || 'GET'
  // Do not dedupe when caller attaches a signal — abort must not kill shared waiters
  const isDedupable =
    (!init?.method || init.method === 'GET') && !init?.signal

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

  const { signal, cleanup: cleanupSignal } = mergeAbortSignals(
    init?.signal ?? undefined,
    timeoutMs,
  )
  const fetchInit: RequestInit = { ...init, signal }

  // POST single-flight only when no AbortSignal (shared waiters must not share aborts)
  const bodyStr =
    typeof init?.body === 'string'
      ? init.body
      : init?.body != null
        ? null
        : ''
  const canSingleFlightPost =
    method.toUpperCase() === 'POST' &&
    typeof bodyStr === 'string' &&
    !init?.signal &&
    (url.includes('/api/discover/rank') || url.includes('/api/analytics'))

  const isAnalytics = url.includes('/api/analytics')
  const isDiscoverRank = url.includes('/api/discover/rank')

  // Non-critical traffic yields under browser socket pressure
  if (isAnalytics && underResourcePressure()) {
    cleanupSignal()
    throw new DOMException('Analytics deferred (resource pressure)', 'AbortError')
  }

  const runNetwork = async (): Promise<Response> => {
    let lastError: unknown
    // Rank gets one forced retry; others respect caller retries only
    const attempts =
      isDiscoverRank && retries === 0 ? 2 : maxAttempts
    try {
      for (let attempt = 0; attempt < attempts; attempt++) {
        if (signal.aborted) {
          throw signal.reason instanceof Error
            ? signal.reason
            : new DOMException('Aborted', 'AbortError')
        }
        try {
          const response = await withRequestSlot(
            () => fetch(input, fetchInit),
            {
              // Rank waits longer for a slot; telemetry drops if busy
              timeoutMs: isDiscoverRank
                ? Math.max(timeoutMs || 40_000, 20_000)
                : isAnalytics
                  ? 3_000
                  : Math.max(timeoutMs || 40_000, 15_000),
              dropIfBusy: isAnalytics,
            },
          )
          if (
            response.ok ||
            attempt === attempts - 1 ||
            !shouldRetryStatus(response.status, retryStatuses)
          ) {
            return response
          }
          if (IS_DEV) {
            console.warn(
              `%c↻ retry ${attempt + 1}/${attempts - 1} after ${response.status}`,
              ERR_STYLE,
            )
          }
          await response.arrayBuffer().catch(() => {})
          await sleep(retryDelayMs * 2 ** attempt + Math.random() * 150)
        } catch (error) {
          lastError = error
          if (isAbortError(error)) throw error
          if (isInsufficientResourcesError(error)) {
            markResourcePressure(20_000)
            if (attempt < attempts - 1) {
              if (IS_DEV) {
                console.warn(
                  `%c↻ browser resources low — cooling down then retry %c${url.slice(0, 80)}`,
                  ERR_STYLE,
                  DIM_STYLE,
                )
              }
              await sleep(1500 + Math.random() * 1000)
              continue
            }
            // Message-only throw so React doesn't dump multi-MB fiber stacks
            throw new TypeError(
              `net::ERR_INSUFFICIENT_RESOURCES (${method} ${url.slice(0, 120)})`,
            )
          }
          if (attempt === attempts - 1) throw error
          if (IS_DEV) {
            console.warn(
              `%c↻ retry ${attempt + 1}/${attempts - 1} after network error`,
              ERR_STYLE,
            )
          }
          await sleep(retryDelayMs * 2 ** attempt + Math.random() * 150)
        }
      }
      throw lastError instanceof Error ? lastError : new Error('clientFetch failed')
    } finally {
      cleanupSignal()
    }
  }

  const promise = (async (): Promise<Response> => {
    if (canSingleFlightPost && bodyStr != null) {
      const sfKey = singleFlightKey(method, url, bodyStr)
      return withSingleFlight(sfKey, runNetwork)
    }
    return runNetwork()
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
    // Operator metrics (local ring buffer — never network)
    try {
      void import('./pipeline/requestMetrics').then(({ recordRequestMetric }) => {
        recordRequestMetric('fetch', `${method} ${url.slice(0, 100)}`, {
          ms: duration,
          status: response.status,
        })
      })
    } catch {
      /* ignore */
    }
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
    const aborted = isAbortError(error)
    const timeoutAbort =
      aborted &&
      error instanceof Error &&
      /timed out/i.test(error.message)

    // Intentional cancels (SPA leave, category remount, React Strict Mode
    // double-invoke) are not product failures. Logging them with console.error
    // dumps multi-thousand-frame React stacks that look like "stack overflow".
    if (aborted && !timeoutAbort) {
      if (IS_DEV) {
        console.debug(
          `%c· cancelled %c${ms(duration)}`,
          DIM_STYLE,
          TIME_STYLE,
        )
        console.groupEnd()
      }
      throw error
    }

    const source = metricSource(url)
    const errMsg = error instanceof Error ? error.message : String(error)

    if (source) {
      enqueueMetric({
        source,
        endpoint: url,
        status: 0,
        duration_ms: duration,
        error: errMsg,
        has_data: false,
      })
    }

    logFetchOutcome(url, method, 0, duration, false)
    try {
      void import('./pipeline/requestMetrics').then(({ recordRequestMetric }) => {
        recordRequestMetric(
          isInsufficientResourcesError(error) ? 'fetch_resource' : 'fetch_err',
          `${method} ${url.slice(0, 100)}`,
          { ms: duration, detail: errMsg.slice(0, 120) },
        )
      })
    } catch {
      /* ignore */
    }
    if (IS_DEV) {
      // Never console.error(Error) — Chrome expands React fiber stacks (ol/or spam)
      if (timeoutAbort || isInsufficientResourcesError(error)) {
        console.warn(
          `%c✗ ${timeoutAbort ? 'Timeout' : 'Resources'} %c${ms(duration)} %c${errMsg}`,
          ERR_STYLE,
          TIME_STYLE,
          DIM_STYLE,
        )
      } else {
        console.warn(
          `%c✗ Network error %c${ms(duration)} %c${errMsg}`,
          ERR_STYLE,
          TIME_STYLE,
          DIM_STYLE,
        )
      }
      console.groupEnd()
    }
    throw error
  }
}
