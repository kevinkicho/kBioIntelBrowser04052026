/**
 * Free-API Agent — single policy runtime for public API calls.
 *
 * Product law:
 * - Of-record data comes only from free public APIs (deterministic HTTP).
 * - This agent does NOT invent evidence or call an LLM for facts.
 * - It centralizes timeout / retry / abort / empty / metrics so we stop
 *   hardcoding the same rules in every client file.
 *
 * Optional LLM agents (copilot) may *orchestrate* which tools to call;
 * they must only consume results from this layer (or category fan-outs).
 */

import { payloadHasData } from '../hasData'
import type { DataLoadStatus } from '../dataStatus'
import { isApiSourceDisabled, getApiSourceDisabledReason } from './sourceAvailability'
import { timedFetch, DEFAULT_LEAF_TIMEOUT_MS } from './timedFetch'
import { getApiAbortSignal } from './apiAbort'

export type FreeApiAgentStatus = DataLoadStatus

export interface FreeApiAgentResult<T> {
  data: T
  source: string
  status: FreeApiAgentStatus
  ms: number
  attempts: number
  error?: string
}

export interface FreeApiAgentContext {
  signal: AbortSignal
  attempt: number
  source: string
}

export interface FreeApiAgentSpec<T> {
  /** Stable source id for metrics / UI (e.g. 'mesh', 'gwas-catalog') */
  source: string
  /** Value when disabled, timeout, error, or empty parse */
  empty: T
  /** Per-attempt wall clock (default DEFAULT_LEAF_TIMEOUT_MS) */
  timeoutMs?: number
  /** Extra attempts after first (default 0). Total tries = 1 + retries */
  retries?: number
  /** HTTP statuses that trigger retry (default 429, 502, 503, 504) */
  retryStatuses?: number[]
  /** Primary work — free public API only */
  run: (ctx: FreeApiAgentContext) => Promise<T>
  /** Optional free fallback when primary yields empty or fails */
  fallback?: (ctx: FreeApiAgentContext) => Promise<T>
  /** Override data-present check (default payloadHasData) */
  hasData?: (data: T) => boolean
}

const DEFAULT_RETRY_STATUSES = new Set([429, 502, 503, 504])

function isAbortErr(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && (err.name === 'AbortError' || /timeout|timed?\s*out/i.test(err.message)))
  )
}

function mergeSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a) return b
  if (!b) return a
  if (a.aborted) return a
  if (b.aborted) return b
  const c = new AbortController()
  const onAbort = () => {
    if (c.signal.aborted) return
    try {
      c.abort(a.aborted ? a.reason : b.reason)
    } catch {
      c.abort()
    }
  }
  a.addEventListener('abort', onAbort, { once: true })
  b.addEventListener('abort', onAbort, { once: true })
  return c.signal
}

/**
 * Run a free-API task under unified policy.
 * Always resolves (never throws) — returns empty + status on failure.
 */
export async function freeApiAgent<T>(spec: FreeApiAgentSpec<T>): Promise<FreeApiAgentResult<T>> {
  const start = Date.now()
  const timeoutMs = spec.timeoutMs ?? DEFAULT_LEAF_TIMEOUT_MS
  const maxAttempts = 1 + Math.max(0, spec.retries ?? 0)
  const retryStatuses = new Set(spec.retryStatuses ?? Array.from(DEFAULT_RETRY_STATUSES))
  const checkData = spec.hasData ?? ((d: T) => payloadHasData(d as unknown))

  if (isApiSourceDisabled(spec.source)) {
    return {
      data: spec.empty,
      source: spec.source,
      status: 'disabled',
      ms: 0,
      attempts: 0,
      error: getApiSourceDisabledReason(spec.source) ?? 'Source disabled',
    }
  }

  let lastError: string | undefined
  let attempts = 0

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt
    const controller = new AbortController()
    const timer = setTimeout(() => {
      try {
        controller.abort(new DOMException(`freeApiAgent timeout after ${timeoutMs}ms`, 'AbortError'))
      } catch {
        controller.abort()
      }
    }, timeoutMs)
    const signal = mergeSignals(getApiAbortSignal(), controller.signal)!

    try {
      // Hard race: abort alone is not enough if run() ignores signal
      const data = await raceAbortable(
        spec.run({ signal, attempt, source: spec.source }),
        signal,
      )
      clearTimeout(timer)
      if (checkData(data)) {
        return {
          data,
          source: spec.source,
          status: 'loaded',
          ms: Date.now() - start,
          attempts,
        }
      }
      // empty primary — try fallback once on last attempt
      if (spec.fallback && attempt === maxAttempts) {
        const fb = await raceAbortable(
          runFallback(spec, signal, attempt, checkData),
          signal,
        )
        return { ...fb, ms: Date.now() - start, attempts }
      }
      lastError = 'empty'
    } catch (err) {
      clearTimeout(timer)
      lastError = err instanceof Error ? err.message : String(err)
      const aborted = isAbortErr(err)
      const httpStatus =
        err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
          ? (err as { status: number }).status
          : undefined
      const retryableHttp = httpStatus != null && retryStatuses.has(httpStatus)
      const retryableMsg = /HTTP\s*(429|502|503|504)|rate\s*limit|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
        lastError,
      )
      // Retry on retryable HTTP statuses / transport blips only (not 4xx hard failures)
      const shouldRetry =
        attempt < maxAttempts &&
        !aborted &&
        (retryableHttp || retryableMsg || (httpStatus == null && !/^HTTP\s*[45]\d\d/.test(lastError)))
      if (shouldRetry) {
        await sleep(200 * attempt)
        continue
      }
      if (spec.fallback && !aborted) {
        try {
          const fbController = new AbortController()
          const fbTimer = setTimeout(() => {
            try {
              fbController.abort(new DOMException('fallback timeout', 'AbortError'))
            } catch {
              fbController.abort()
            }
          }, timeoutMs)
          const fbSignal = mergeSignals(getApiAbortSignal(), fbController.signal)!
          try {
            const fb = await raceAbortable(
              runFallback(spec, fbSignal, attempt, checkData),
              fbSignal,
            )
            return { ...fb, ms: Date.now() - start, attempts }
          } finally {
            clearTimeout(fbTimer)
          }
        } catch {
          /* fall through */
        }
      }
      return {
        data: spec.empty,
        source: spec.source,
        status: aborted ? 'timeout' : 'error',
        ms: Date.now() - start,
        attempts,
        error: lastError,
      }
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    data: spec.empty,
    source: spec.source,
    status: lastError === 'empty' ? 'empty' : 'error',
    ms: Date.now() - start,
    attempts,
    error: lastError,
  }
}

async function runFallback<T>(
  spec: FreeApiAgentSpec<T>,
  signal: AbortSignal,
  attempt: number,
  checkData: (d: T) => boolean,
): Promise<FreeApiAgentResult<T>> {
  if (!spec.fallback) {
    return {
      data: spec.empty,
      source: spec.source,
      status: 'empty',
      ms: 0,
      attempts: attempt,
    }
  }
  const data = await spec.fallback({ signal, attempt, source: spec.source })
  return {
    data: checkData(data) ? data : spec.empty,
    source: spec.source,
    status: checkData(data) ? 'loaded' : 'empty',
    ms: 0,
    attempts: attempt,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Race work against AbortSignal. Critical: many free-API clients ignore
 * `signal`, so abort alone does not settle the promise. This forces the
 * agent wall clock to win even when run() never checks abort.
 */
function raceAbortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    const reason =
      signal.reason instanceof Error
        ? signal.reason
        : new DOMException('freeApiAgent aborted', 'AbortError')
    return Promise.reject(reason)
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      const reason =
        signal.reason instanceof Error
          ? signal.reason
          : new DOMException('freeApiAgent aborted', 'AbortError')
      reject(reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    work.then(
      (v) => {
        signal.removeEventListener('abort', onAbort)
        resolve(v)
      },
      (e) => {
        signal.removeEventListener('abort', onAbort)
        reject(e)
      },
    )
  })
}

/**
 * JSON GET via freeApiAgent policy (timeout + empty null).
 */
export async function freeApiJson<T = unknown>(
  source: string,
  url: string,
  options?: {
    timeoutMs?: number
    retries?: number
    headers?: HeadersInit
    init?: RequestInit
  },
): Promise<FreeApiAgentResult<T | null>> {
  return freeApiAgent<T | null>({
    source,
    empty: null,
    timeoutMs: options?.timeoutMs,
    retries: options?.retries ?? 0,
    run: async ({ signal }) => {
      const res = await timedFetch(url, {
        ...options?.init,
        signal,
        timeoutMs: options?.timeoutMs ?? DEFAULT_LEAF_TIMEOUT_MS,
        headers: { Accept: 'application/json', ...options?.headers, ...options?.init?.headers },
      })
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`)
        ;(err as { status?: number }).status = res.status
        throw err
      }
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (ct.includes('text/html')) return null
      const text = await res.text()
      if (!text || text.trimStart().startsWith('<')) return null
      return JSON.parse(text) as T
    },
  })
}

// Note: category fan-outs continue to use trackedSafe() for metrics bags.
// New clients should call freeApiAgent() directly; leaf routes use leafRouteAgent.
