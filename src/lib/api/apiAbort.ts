/**
 * Request-scoped AbortSignal for free-API fanouts.
 *
 * Category routes call `runWithApiAbort` so wall-clock timeout / client disconnect
 * can stop in-flight `fetch` work. Uses AsyncLocalStorage so concurrent category
 * loads on the same Node process do not clobber each other's signals.
 *
 * A one-time global `fetch` patch merges the ALS signal into every outbound request
 * (when a store is active). Call sites do not need per-client signal plumbing.
 * Safe when no store is active: original fetch behavior is unchanged.
 */

import { AsyncLocalStorage } from 'async_hooks'

const abortAls = new AsyncLocalStorage<AbortSignal>()

let fetchPatched = false
let originalFetch: typeof globalThis.fetch | null = null

function mergeSignals(
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
    const reason = a.aborted ? a.reason : b.reason
    try {
      merged.abort(reason)
    } catch {
      merged.abort()
    }
  }
  a.addEventListener('abort', onAbort, { once: true })
  b.addEventListener('abort', onAbort, { once: true })
  return merged.signal
}

/** Install concurrent-safe fetch patch once (server only). */
export function ensureApiFetchAbortPatch(): void {
  if (fetchPatched) return
  if (typeof globalThis.fetch !== 'function') return
  fetchPatched = true
  originalFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const als = abortAls.getStore()
    if (!als) {
      return originalFetch!(input, init)
    }
    // RequestInit.signal is typed AbortSignal | null | undefined in DOM libs
    const initSignal = init?.signal ?? undefined
    const signal = mergeSignals(initSignal ?? undefined, als)
    if (signal?.aborted) {
      return Promise.reject(
        signal.reason instanceof Error
          ? signal.reason
          : new DOMException('Aborted', 'AbortError'),
      )
    }
    return originalFetch!(input, signal ? { ...init, signal } : init)
  }) as typeof fetch
}

/** Active category/request abort signal, if any. */
export function getApiAbortSignal(): AbortSignal | undefined {
  return abortAls.getStore()
}

/**
 * Run work with an AbortSignal visible to patched `fetch` and `getApiAbortSignal`.
 * Also links `extraSignals` (e.g. NextRequest.signal) so client disconnect aborts.
 */
export async function runWithApiAbort<T>(
  controller: AbortController,
  fn: () => Promise<T>,
  extraSignals?: AbortSignal[],
): Promise<T> {
  ensureApiFetchAbortPatch()

  for (const sig of extraSignals ?? []) {
    if (sig.aborted) {
      try {
        controller.abort(sig.reason)
      } catch {
        controller.abort()
      }
      break
    }
    sig.addEventListener(
      'abort',
      () => {
        if (controller.signal.aborted) return
        try {
          controller.abort(sig.reason)
        } catch {
          controller.abort()
        }
      },
      { once: true },
    )
  }

  return abortAls.run(controller.signal, fn)
}

/** Test helper: restore original fetch and clear patch flag. */
export function resetApiFetchAbortPatchForTests(): void {
  if (originalFetch) {
    globalThis.fetch = originalFetch
  }
  originalFetch = null
  fetchPatched = false
}
