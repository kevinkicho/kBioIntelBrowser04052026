/**
 * Browser request protocol — prevent net::ERR_INSUFFICIENT_RESOURCES storms.
 *
 * Chrome exhausts sockets/memory when many concurrent fetches + websockets open.
 * Product law: best-effort telemetry never blocks UX; rank stays single-flight.
 */

/** Max simultaneous browser fetches through the gate (same-origin + third-party). */
export const MAX_BROWSER_CONCURRENT = 6

/** Soft delay when a slot is unavailable (ms). */
export const GATE_WAIT_SLICE_MS = 40

/** Cap waiters so a hung tab cannot queue forever. */
export const MAX_GATE_WAITERS = 64

type Waiter = {
  resolve: () => void
  reject: (err: Error) => void
  timer?: ReturnType<typeof setTimeout>
}

let inFlight = 0
const waiters: Waiter[] = []

function wakeNext(): void {
  while (inFlight < MAX_BROWSER_CONCURRENT && waiters.length > 0) {
    const w = waiters.shift()!
    if (w.timer) clearTimeout(w.timer)
    inFlight++
    w.resolve()
  }
}

/**
 * Acquire a concurrency slot. Resolves when under the browser concurrent cap.
 * Rejects if the waiter queue is saturated (caller should skip non-critical work).
 */
export function acquireRequestSlot(opts?: {
  /** Max ms to wait for a slot; 0 = wait indefinitely until released */
  timeoutMs?: number
  /** If true, reject immediately when at capacity (telemetry) */
  dropIfBusy?: boolean
}): Promise<void> {
  if (inFlight < MAX_BROWSER_CONCURRENT) {
    inFlight++
    return Promise.resolve()
  }

  if (opts?.dropIfBusy) {
    return Promise.reject(new Error('request_gate_busy'))
  }

  if (waiters.length >= MAX_GATE_WAITERS) {
    return Promise.reject(new Error('request_gate_saturated'))
  }

  return new Promise<void>((resolve, reject) => {
    const waiter: Waiter = { resolve, reject }
    const timeoutMs = opts?.timeoutMs
    if (timeoutMs != null && timeoutMs > 0) {
      waiter.timer = setTimeout(() => {
        const i = waiters.indexOf(waiter)
        if (i >= 0) waiters.splice(i, 1)
        reject(new Error('request_gate_timeout'))
      }, timeoutMs)
    }
    waiters.push(waiter)
  })
}

export function releaseRequestSlot(): void {
  inFlight = Math.max(0, inFlight - 1)
  wakeNext()
}

/**
 * Run `fn` under the concurrency gate.
 * Always releases the slot, even on throw/abort.
 */
export async function withRequestSlot<T>(
  fn: () => Promise<T>,
  opts?: Parameters<typeof acquireRequestSlot>[0],
): Promise<T> {
  await acquireRequestSlot(opts)
  try {
    return await fn()
  } finally {
    releaseRequestSlot()
  }
}

/** Test / diagnostics */
export function requestGateSnapshot(): {
  inFlight: number
  waiting: number
  max: number
} {
  return { inFlight, waiting: waiters.length, max: MAX_BROWSER_CONCURRENT }
}

/** Test helper — drain waiters and reset counters */
export function resetRequestGateForTests(): void {
  inFlight = 0
  while (waiters.length) {
    const w = waiters.shift()!
    if (w.timer) clearTimeout(w.timer)
    w.reject(new Error('request_gate_reset'))
  }
}

/**
 * Single-flight map for identical POSTs (e.g. discover rank).
 * Keyed by method+url+body; concurrent callers share one network hop.
 * When a signal aborts, only that waiter rejects; the shared fetch continues
 * unless all waiters aborted and we choose to abort (not implemented — keep simple).
 */
const singleFlight = new Map<string, Promise<Response>>()

export function singleFlightKey(
  method: string,
  url: string,
  body?: string | null,
): string {
  const b = body ?? ''
  // Bound key size for long rank bodies
  const slice = b.length > 800 ? `${b.slice(0, 400)}…${b.slice(-200)}:${b.length}` : b
  return `${method.toUpperCase()}:${url}:${slice}`
}

/**
 * Share an in-flight POST/GET promise among identical concurrent callers.
 * Returns a cloned Response per waiter so bodies can be read independently.
 */
export async function withSingleFlight(
  key: string,
  factory: () => Promise<Response>,
): Promise<Response> {
  const existing = singleFlight.get(key)
  if (existing) {
    const res = await existing
    return res.clone()
  }
  const promise = factory().finally(() => {
    singleFlight.delete(key)
  })
  singleFlight.set(key, promise)
  try {
    const res = await promise
    return res.clone()
  } catch (e) {
    throw e
  }
}

export function clearSingleFlightForTests(): void {
  singleFlight.clear()
}

/** Detect browser resource exhaustion errors */
export function isInsufficientResourcesError(error: unknown): boolean {
  if (!error) return false
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error)
  // Do not treat generic AbortError as resources — only real socket exhaustion
  if (/abort/i.test(msg) && !/insufficient/i.test(msg)) return false
  return /insufficient.?resources|ERR_INSUFFICIENT_RESOURCES|Failed to fetch/i.test(
    msg,
  )
}

/** After Chrome ERR_INSUFFICIENT_RESOURCES, cool down non-critical network. */
let resourcePressureUntil = 0

export function markResourcePressure(ms = 20_000): void {
  resourcePressureUntil = Math.max(resourcePressureUntil, Date.now() + ms)
  // Drop queued waiters so the tab can recover
  while (waiters.length > 0) {
    const w = waiters.shift()!
    if (w.timer) clearTimeout(w.timer)
    w.reject(new Error('request_gate_pressure'))
  }
  try {
    void import('./pipeline/requestMetrics').then(({ recordRequestMetric }) => {
      recordRequestMetric('pressure', 'resource_pressure', {
        detail: `cool-down ${ms}ms`,
      })
    })
  } catch {
    /* ignore */
  }
}

export function underResourcePressure(): boolean {
  return Date.now() < resourcePressureUntil
}

export function clearResourcePressureForTests(): void {
  resourcePressureUntil = 0
}
