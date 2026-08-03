/**
 * Shared fetch helper for external APIs that may return large or non-JSON bodies.
 *
 * Policy (see also massbank / iuphar):
 * - Prefer `cache: 'no-store'` for unpredictable/large responses — Next.js Data
 *   Cache rejects items over 2MB and still fails noisily if revalidate is set.
 * - Cap body size after download when Content-Length is missing.
 * - Reject HTML (common when "API" URLs actually serve a web UI).
 * - Optional host rate limiting for free public APIs.
 */

import { acquireRateLimit, noteRateLimitFromResponse } from '../rateLimit'
import { getApiAbortSignal } from './apiAbort'
import { politeHeaders } from './freeApiEtiquette'

export const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024
export const DEFAULT_FETCH_TIMEOUT_MS = 12000

export interface FetchJsonWithSizeLimitOptions {
  maxBytes?: number
  timeoutMs?: number
  headers?: HeadersInit
  /** Default: 'no-store' — do not use next.revalidate for large/unpredictable APIs */
  cache?: RequestCache
  signal?: AbortSignal
}

/**
 * Fetch a URL and parse JSON only if the body is within maxBytes and looks like JSON.
 * Returns null on non-OK status, oversize body, HTML, timeout, or parse failure.
 * Merges caller signal + category ALS abort (runWithApiAbort).
 */
export async function fetchJsonWithSizeLimit<T = unknown>(
  url: string,
  options: FetchJsonWithSizeLimitOptions = {},
): Promise<T | null> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_RESPONSE_BYTES
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const outerSignals = [options.signal, getApiAbortSignal()].filter(
    (s): s is AbortSignal => Boolean(s),
  )

  const onOuterAbort = () => {
    try {
      controller.abort()
    } catch {
      /* ignore */
    }
  }

  for (const sig of outerSignals) {
    if (sig.aborted) {
      clearTimeout(timeout)
      return null
    }
    sig.addEventListener('abort', onOuterAbort, { once: true })
  }

  let slot: { release: () => void } | undefined
  try {
    slot = await acquireRateLimit(url, { signal: controller.signal })
    const res = await fetch(url, {
      headers: politeHeaders({ Accept: 'application/json', ...options.headers }),
      cache: options.cache ?? 'no-store',
      signal: controller.signal,
    })

    if (res.status === 429 || res.status === 503) {
      noteRateLimitFromResponse(url, res)
    }
    if (!res.ok) return null

    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) return null

    const contentLength = res.headers.get('content-length')
    if (contentLength) {
      const len = parseInt(contentLength, 10)
      if (!Number.isNaN(len) && len > maxBytes) return null
    }

    const text = await res.text()
    if (text.length > maxBytes) return null

    const trimmed = text.trimStart()
    if (!trimmed || trimmed.startsWith('<')) return null

    return JSON.parse(text) as T
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    slot?.release()
    for (const sig of outerSignals) {
      sig.removeEventListener('abort', onOuterAbort)
    }
  }
}
