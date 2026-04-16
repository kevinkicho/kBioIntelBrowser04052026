const IS_DEV = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

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

export async function clientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
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

  const promise = fetch(input, init).then(response => {
    if (isDedupable) {
      inFlight.delete(key)
    }
    return response
  }).catch(error => {
    if (isDedupable) {
      inFlight.delete(key)
    }
    throw error
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
    const size = response.headers.get('content-length')
    const sizeStr = size ? ` ${Math.round(parseInt(size) / 1024)}KB` : ''

    const source = url.includes('/category/')
      ? null
      : url.includes('/panel/')
        ? 'panel:' + url.split('/panel/')[1]?.split('/')[0]?.split('?')[0]
        : url.includes('/search')
          ? 'search'
          : url.includes('/similar')
            ? 'similar'
            : url

    if (source) {
      enqueueMetric({
        source,
        endpoint: url,
        status: response.status,
        duration_ms: duration,
        has_data: response.ok,
      })
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

    const source = url.includes('/category/')
      ? null
      : url.includes('/panel/')
        ? 'panel:' + url.split('/panel/')[1]?.split('/')[0]?.split('?')[0]
        : url.includes('/search')
          ? 'search'
          : url.includes('/similar')
            ? 'similar'
            : url

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

    if (IS_DEV) console.error(
      `%c✗ Network error %c${ms(duration)}`,
      ERR_STYLE, TIME_STYLE,
      error,
    )
    if (IS_DEV) console.groupEnd()
    throw error
  }
}