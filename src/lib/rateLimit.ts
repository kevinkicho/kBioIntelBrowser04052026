/**
 * Process-local free-API etiquette: token-bucket + concurrency + 429 cooldowns.
 *
 * Prevents stampeding PubChem/NCBI/EBI when categories fan out.
 * Not shared across serverless instances — sufficient for solo / small deploy.
 *
 * Owned by freeApiAgent / timedFetch — clients should not re-implement.
 */

export interface RateLimitConfig {
  /** Max tokens (burst) */
  capacity: number
  /** Tokens added per second */
  refillPerSec: number
  /** Max concurrent in-flight requests to this host (default 2) */
  maxConcurrent?: number
}

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()
const inFlight = new Map<string, number>()
const waiters = new Map<string, Array<() => void>>()
/** Host → epoch ms when we may send again (Retry-After / polite cool-down) */
const cooldownUntil = new Map<string, number>()

/**
 * Conservative free-API etiquette defaults (public docs / observed norms).
 * Prefer under-firing over 429 storms.
 */
const HOST_LIMITS: Record<string, RateLimitConfig> = {
  // NCBI / PubChem — official guidance is low without API key
  'pubchem.ncbi.nlm.nih.gov': { capacity: 5, refillPerSec: 2.5, maxConcurrent: 2 },
  'eutils.ncbi.nlm.nih.gov': { capacity: 3, refillPerSec: 2, maxConcurrent: 1 },
  'www.ncbi.nlm.nih.gov': { capacity: 4, refillPerSec: 2, maxConcurrent: 2 },
  // EBI / EMBL
  'www.ebi.ac.uk': { capacity: 8, refillPerSec: 4, maxConcurrent: 3 },
  'rest.ensembl.org': { capacity: 6, refillPerSec: 3, maxConcurrent: 2 },
  'www.uniprot.org': { capacity: 6, refillPerSec: 3, maxConcurrent: 2 },
  'rest.uniprot.org': { capacity: 6, refillPerSec: 3, maxConcurrent: 2 },
  // FDA / clinical
  'api.fda.gov': { capacity: 5, refillPerSec: 2.5, maxConcurrent: 2 },
  'clinicaltrials.gov': { capacity: 5, refillPerSec: 2.5, maxConcurrent: 2 },
  'www.accessdata.fda.gov': { capacity: 3, refillPerSec: 1, maxConcurrent: 1 },
  // Literature / orgs
  'api.openalex.org': { capacity: 8, refillPerSec: 5, maxConcurrent: 3 },
  'api.semanticscholar.org': { capacity: 3, refillPerSec: 1, maxConcurrent: 1 },
  'api.crossref.org': { capacity: 6, refillPerSec: 3, maxConcurrent: 2 },
  'api.ror.org': { capacity: 6, refillPerSec: 3, maxConcurrent: 2 },
  // Targets / chem
  'www.ebi.ac.uk/chembl': { capacity: 6, refillPerSec: 3, maxConcurrent: 2 },
  'pharos-api.ncats.io': { capacity: 4, refillPerSec: 2, maxConcurrent: 2 },
  'string-db.org': { capacity: 4, refillPerSec: 2, maxConcurrent: 1 },
  'version-11-5.string-db.org': { capacity: 4, refillPerSec: 2, maxConcurrent: 1 },
  'reactome.org': { capacity: 5, refillPerSec: 2.5, maxConcurrent: 2 },
  // default polite
  default: { capacity: 8, refillPerSec: 4, maxConcurrent: 2 },
}

/** Source-id buckets when URL host is unknown (agent source key). */
const SOURCE_LIMITS: Record<string, RateLimitConfig> = {
  mesh: { capacity: 3, refillPerSec: 2, maxConcurrent: 1 },
  pubchem: { capacity: 5, refillPerSec: 2.5, maxConcurrent: 2 },
  'ncbi-gene': { capacity: 3, refillPerSec: 2, maxConcurrent: 1 },
  default: { capacity: 10, refillPerSec: 5, maxConcurrent: 3 },
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return 'default'
  }
}

function getHostConfig(host: string): RateLimitConfig {
  if (HOST_LIMITS[host]) return HOST_LIMITS[host]!
  // prefix match for multi-path hosts
  for (const [k, v] of Object.entries(HOST_LIMITS)) {
    if (k !== 'default' && host.endsWith(k)) return v
  }
  return HOST_LIMITS.default!
}

function getSourceConfig(source: string): RateLimitConfig {
  return SOURCE_LIMITS[source] ?? SOURCE_LIMITS.default!
}

function refillBucket(key: string, cfg: RateLimitConfig): Bucket {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { tokens: cfg.capacity, lastRefill: now }
    buckets.set(key, bucket)
    return bucket
  }
  const elapsed = (now - bucket.lastRefill) / 1000
  bucket.tokens = Math.min(cfg.capacity, bucket.tokens + elapsed * cfg.refillPerSec)
  bucket.lastRefill = now
  return bucket
}

async function waitCooldown(key: string, signal?: AbortSignal): Promise<void> {
  const until = cooldownUntil.get(key) ?? 0
  const wait = until - Date.now()
  if (wait <= 0) return
  await sleepAbortable(Math.min(wait, 30_000), signal)
}

async function acquireConcurrency(key: string, max: number, signal?: AbortSignal): Promise<void> {
  for (;;) {
    if (signal?.aborted) {
      throw signal.reason instanceof Error
        ? signal.reason
        : new DOMException('Aborted waiting for rate limit', 'AbortError')
    }
    const n = inFlight.get(key) ?? 0
    if (n < max) {
      inFlight.set(key, n + 1)
      return
    }
    await new Promise<void>((resolve) => {
      const list = waiters.get(key) ?? []
      list.push(resolve)
      waiters.set(key, list)
    })
  }
}

function releaseConcurrency(key: string): void {
  const n = Math.max(0, (inFlight.get(key) ?? 1) - 1)
  inFlight.set(key, n)
  const list = waiters.get(key)
  if (list && list.length > 0) {
    const next = list.shift()!
    waiters.set(key, list)
    next()
  }
}

function sleepAbortable(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  if (signal?.aborted) {
    return Promise.reject(
      signal.reason instanceof Error
        ? signal.reason
        : new DOMException('Aborted', 'AbortError'),
    )
  }
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)
    const onAbort = () => {
      cleanup()
      reject(
        signal?.reason instanceof Error
          ? signal.reason
          : new DOMException('Aborted', 'AbortError'),
      )
    }
    const cleanup = () => {
      clearTimeout(t)
      signal?.removeEventListener('abort', onAbort)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Wait for host cooldown + concurrency + token, then consume one token.
 * Call `releaseRateLimit` in a finally when using concurrency (or use withRateLimit).
 */
export async function acquireRateLimit(
  urlOrHost: string,
  options?: { signal?: AbortSignal; isSourceKey?: boolean },
): Promise<{ release: () => void; key: string }> {
  const key = options?.isSourceKey
    ? `source:${urlOrHost}`
    : urlOrHost.includes('://')
      ? hostFromUrl(urlOrHost)
      : urlOrHost.toLowerCase()
  const cfg = options?.isSourceKey
    ? getSourceConfig(urlOrHost)
    : getHostConfig(key.startsWith('source:') ? 'default' : key)
  const maxConc = cfg.maxConcurrent ?? 2

  await waitCooldown(key, options?.signal)
  await acquireConcurrency(key, maxConc, options?.signal)

  const bucket = refillBucket(key, cfg)
  if (bucket.tokens < 1) {
    const need = 1 - bucket.tokens
    const waitMs = Math.min(8_000, Math.ceil((need / cfg.refillPerSec) * 1000) + jitter(50))
    try {
      await sleepAbortable(waitMs, options?.signal)
    } catch (e) {
      releaseConcurrency(key)
      throw e
    }
    const b2 = refillBucket(key, cfg)
    b2.tokens = Math.max(0, b2.tokens - 1)
  } else {
    bucket.tokens -= 1
  }

  let released = false
  return {
    key,
    release: () => {
      if (released) return
      released = true
      releaseConcurrency(key)
    },
  }
}

/** Convenience: acquire → fn → release */
export async function withRateLimit<T>(
  urlOrHost: string,
  fn: () => Promise<T>,
  options?: { signal?: AbortSignal; isSourceKey?: boolean },
): Promise<T> {
  const slot = await acquireRateLimit(urlOrHost, options)
  try {
    return await fn()
  } finally {
    slot.release()
  }
}

/**
 * Record a 429 / rate-limit cool-down for this host (or source).
 * Prefer Retry-After header when present.
 */
export function noteRateLimited(
  urlOrHost: string,
  retryAfterMs: number,
  options?: { isSourceKey?: boolean },
): void {
  const key = options?.isSourceKey
    ? `source:${urlOrHost}`
    : urlOrHost.includes('://')
      ? hostFromUrl(urlOrHost)
      : urlOrHost.toLowerCase()
  const ms = Math.min(Math.max(retryAfterMs, 200), 60_000)
  const until = Date.now() + ms
  const prev = cooldownUntil.get(key) ?? 0
  if (until > prev) cooldownUntil.set(key, until)
}

/** Parse Retry-After header → ms (supports seconds or HTTP-date). */
export function parseRetryAfterMs(header: string | null | undefined): number | undefined {
  if (!header) return undefined
  const trimmed = header.trim()
  const asInt = parseInt(trimmed, 10)
  if (!Number.isNaN(asInt) && String(asInt) === trimmed) {
    return Math.min(asInt * 1000, 60_000)
  }
  const date = Date.parse(trimmed)
  if (!Number.isNaN(date)) {
    return Math.min(Math.max(0, date - Date.now()), 60_000)
  }
  return undefined
}

export function noteRateLimitFromResponse(url: string, res: Response): void {
  if (res.status !== 429 && res.status !== 503) return
  const ra =
    parseRetryAfterMs(res.headers.get('retry-after')) ??
    parseRetryAfterMs(res.headers.get('x-rate-limit-reset')) ??
    2_000 + jitter(500)
  noteRateLimited(url, ra)
}

/** Exponential backoff with full jitter (AWS-style), capped. */
export function etiquetteBackoffMs(
  attempt: number,
  options?: { retryAfterMs?: number; baseMs?: number; maxMs?: number },
): number {
  if (options?.retryAfterMs != null && options.retryAfterMs > 0) {
    return Math.min(options.retryAfterMs + jitter(100), options.maxMs ?? 30_000)
  }
  const base = options?.baseMs ?? 400
  const max = options?.maxMs ?? 12_000
  const exp = Math.min(max, base * Math.pow(2, Math.max(0, attempt - 1)))
  return Math.floor(Math.random() * exp) // full jitter
}

function jitter(max: number): number {
  return Math.floor(Math.random() * max)
}

/** Test helper */
export function resetRateLimitBuckets(): void {
  buckets.clear()
  inFlight.clear()
  waiters.clear()
  cooldownUntil.clear()
}

/** Test / diagnostics */
export function getRateLimitCooldownRemaining(urlOrHost: string): number {
  const key = urlOrHost.includes('://') ? hostFromUrl(urlOrHost) : urlOrHost.toLowerCase()
  return Math.max(0, (cooldownUntil.get(key) ?? 0) - Date.now())
}
