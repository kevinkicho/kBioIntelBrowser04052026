const LOG_STYLE = 'color: #60a5fa; font-weight: bold'
const OK_STYLE = 'color: #34d399'
const ERR_STYLE = 'color: #f87171'
const DIM_STYLE = 'color: #94a3b8'
const TIME_STYLE = 'color: #fbbf24'

function ms(duration: number): string {
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(1)}s`
}

const inFlight = new Map<string, Promise<Response>>()

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
    body: JSON.stringify(batch[0]),
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
      console.log(`%c↑ dedupe %c${method} %c${url}`, DIM_STYLE, LOG_STYLE, DIM_STYLE)
      const res = await existing
      return res.clone()
    }
  }

  const start = performance.now()
  console.group(`%c→ ${method} %c${url}`, LOG_STYLE, DIM_STYLE)

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
    inFlight.set(key, promise)
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
      console.log(
        `%c← ${response.status} %c${ms(duration)}%c${sizeStr}`,
        OK_STYLE, TIME_STYLE, DIM_STYLE,
      )
    } else {
      console.warn(
        `%c← ${response.status} ${response.statusText} %c${ms(duration)}`,
        ERR_STYLE, TIME_STYLE,
      )
    }
    console.groupEnd()
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

    console.error(
      `%c✗ Network error %c${ms(duration)}`,
      ERR_STYLE, TIME_STYLE,
      error,
    )
    console.groupEnd()
    throw error
  }
}