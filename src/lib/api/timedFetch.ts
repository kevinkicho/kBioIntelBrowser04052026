/**
 * Standard free-API fetch helpers with wall-clock AbortSignal + etiquette.
 *
 * Prefer these over bare `fetch` for any public-API client so App Hosting
 * cannot hang indefinitely on a single upstream (PubChem, Orphanet, …).
 *
 * Etiquette (agent-owned, process-local):
 * - Host token-bucket + concurrency via acquireRateLimit
 * - Polite User-Agent / Accept
 * - Record 429 Retry-After cooldowns
 *
 * Intentionally does NOT import `apiAbort` (Node async_hooks) so modules that
 * use timedFetch remain importable from client components. Under
 * `runWithApiAbort`, the global fetch patch still merges ALS.
 */

import {
  acquireRateLimit,
  noteRateLimitFromResponse,
  parseRetryAfterMs,
} from '../rateLimit'
import { FreeApiRateLimitError, politeHeaders } from './freeApiEtiquette'

export const DEFAULT_LEAF_TIMEOUT_MS = 8_000

function mergeAbortSignals(
  a: AbortSignal | undefined,
  b: AbortSignal | undefined,
): AbortSignal | undefined {
  if (!a) return b
  if (!b) return a
  if (a.aborted) return a
  if (b.aborted) return b
  const merged = new AbortController()
  const onAbort = () => {
    if (merged.signal.aborted) return
    try {
      merged.abort(a.aborted ? a.reason : b.reason)
    } catch {
      merged.abort()
    }
  }
  a.addEventListener('abort', onAbort, { once: true })
  b.addEventListener('abort', onAbort, { once: true })
  return merged.signal
}

export interface TimedFetchOptions extends RequestInit {
  /** Wall-clock timeout (default 8s). Pass 0 to disable timer. */
  timeoutMs?: number
  /** Skip host rate-limit acquire (rare; default false). */
  skipRateLimit?: boolean
  /** When true, throw FreeApiRateLimitError on HTTP 429 instead of returning res. */
  throwOnRateLimit?: boolean
}

/**
 * `fetch` with wall-clock timeout + free-API etiquette.
 * Category ALS abort is applied by the server fetch patch when active.
 * Throws on network/abort (caller decides fallback).
 */
export async function timedFetch(
  url: string,
  options: TimedFetchOptions = {},
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_LEAF_TIMEOUT_MS,
    signal: outerSignal,
    skipRateLimit = false,
    throwOnRateLimit = false,
    headers: outerHeaders,
    ...init
  } = options
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      try {
        controller.abort(new DOMException(`timedFetch timeout after ${timeoutMs}ms`, 'AbortError'))
      } catch {
        controller.abort()
      }
    }, timeoutMs)
  }

  const signal = mergeAbortSignals(outerSignal ?? undefined, controller.signal)
  const headers = politeHeaders(outerHeaders)

  let slot: { release: () => void } | undefined
  try {
    if (!skipRateLimit) {
      slot = await acquireRateLimit(url, { signal: signal ?? undefined })
    }
    const res = await fetch(url, { ...init, headers, signal })
    if (res.status === 429 || res.status === 503) {
      noteRateLimitFromResponse(url, res)
      if (throwOnRateLimit && res.status === 429) {
        const ra =
          parseRetryAfterMs(res.headers.get('retry-after')) ??
          2_000
        throw new FreeApiRateLimitError(`HTTP 429 rate limited: ${url}`, ra)
      }
    }
    return res
  } finally {
    if (timer) clearTimeout(timer)
    slot?.release()
  }
}

/**
 * JSON GET/POST helper — returns null on non-OK, HTML, timeout, or parse failure.
 * Uses etiquette rate limit; does not throw on 429 (returns null) unless you need
 * freeApiAgent retry — prefer freeApiJson for agent-managed 429 retries.
 */
export async function timedFetchJson<T = unknown>(
  url: string,
  options: TimedFetchOptions = {},
): Promise<T | null> {
  try {
    const res = await timedFetch(url, {
      ...options,
      headers: politeHeaders({ Accept: 'application/json', ...options.headers }),
    })
    if (!res.ok) return null
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (ct.includes('text/html')) return null
    const text = await res.text()
    if (!text || text.trimStart().startsWith('<')) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
