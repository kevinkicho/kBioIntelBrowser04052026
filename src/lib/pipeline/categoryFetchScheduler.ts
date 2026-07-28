/**
 * Limit concurrent profile category network loads (stampede control).
 * Independent of general browser fetch gate — categories fan out many free APIs each.
 */

/** Max simultaneous category network fetches (profile cold-open). */
export const MAX_CATEGORY_NETWORK = 3

/** Cap waiters so a hung profile cannot queue forever. */
export const MAX_CATEGORY_WAITERS = 24

type Waiter = {
  resolve: () => void
  reject: (e: Error) => void
  timer?: ReturnType<typeof setTimeout>
}

let inFlight = 0
const waiters: Waiter[] = []

function wake(): void {
  while (inFlight < MAX_CATEGORY_NETWORK && waiters.length > 0) {
    const w = waiters.shift()!
    if (w.timer) clearTimeout(w.timer)
    inFlight++
    w.resolve()
  }
}

export function acquireCategorySlot(opts?: {
  timeoutMs?: number
  signal?: AbortSignal
}): Promise<void> {
  if (opts?.signal?.aborted) {
    return Promise.reject(
      opts.signal.reason instanceof Error
        ? opts.signal.reason
        : new DOMException('Aborted', 'AbortError'),
    )
  }
  if (inFlight < MAX_CATEGORY_NETWORK) {
    inFlight++
    return Promise.resolve()
  }
  if (waiters.length >= MAX_CATEGORY_WAITERS) {
    return Promise.reject(new Error('category_fetch_queue_saturated'))
  }
  return new Promise((resolve, reject) => {
    const waiter: Waiter = { resolve, reject }
    const timeoutMs = opts?.timeoutMs ?? 120_000
    if (timeoutMs > 0) {
      waiter.timer = setTimeout(() => {
        const i = waiters.indexOf(waiter)
        if (i >= 0) waiters.splice(i, 1)
        reject(new Error('category_fetch_queue_timeout'))
      }, timeoutMs)
    }
    const onAbort = () => {
      const i = waiters.indexOf(waiter)
      if (i >= 0) {
        waiters.splice(i, 1)
        if (waiter.timer) clearTimeout(waiter.timer)
        reject(
          opts?.signal?.reason instanceof Error
            ? opts.signal.reason
            : new DOMException('Aborted', 'AbortError'),
        )
      }
    }
    opts?.signal?.addEventListener('abort', onAbort, { once: true })
    waiters.push(waiter)
  })
}

export function releaseCategorySlot(): void {
  inFlight = Math.max(0, inFlight - 1)
  wake()
}

export async function withCategorySlot<T>(
  fn: () => Promise<T>,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<T> {
  await acquireCategorySlot(opts)
  try {
    return await fn()
  } finally {
    releaseCategorySlot()
  }
}

export function categorySchedulerSnapshot(): {
  inFlight: number
  waiting: number
  max: number
} {
  return { inFlight, waiting: waiters.length, max: MAX_CATEGORY_NETWORK }
}

export function resetCategorySchedulerForTests(): void {
  inFlight = 0
  while (waiters.length) {
    const w = waiters.shift()!
    if (w.timer) clearTimeout(w.timer)
    w.reject(new Error('category_scheduler_reset'))
  }
}

/**
 * Stagger start of many category loads (profile cold-open).
 * Schedules `fn(id)` with delayMs between starts; does not wait for completion.
 */
export function scheduleStaggeredLoads<T>(
  ids: readonly T[],
  fn: (id: T) => void,
  opts?: { delayMs?: number; signal?: AbortSignal },
): () => void {
  const delayMs = opts?.delayMs ?? 180
  const timers: ReturnType<typeof setTimeout>[] = []
  let cancelled = false
  ids.forEach((id, i) => {
    const t = setTimeout(() => {
      if (cancelled || opts?.signal?.aborted) return
      fn(id)
    }, i * delayMs)
    timers.push(t)
  })
  return () => {
    cancelled = true
    for (const t of timers) clearTimeout(t)
  }
}
