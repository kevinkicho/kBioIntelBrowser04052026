/**
 * Simple process-local token-bucket rate limiter for outbound free-API hosts.
 * Prevents stampeding PubChem/NCBI/EBI when multiple categories fan out.
 * Not shared across serverless instances — sufficient for single-user / small deploy.
 */

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitConfig {
  /** Max tokens (burst) */
  capacity: number
  /** Tokens added per second */
  refillPerSec: number
}

const HOST_LIMITS: Record<string, RateLimitConfig> = {
  'pubchem.ncbi.nlm.nih.gov': { capacity: 8, refillPerSec: 4 },
  'eutils.ncbi.nlm.nih.gov': { capacity: 3, refillPerSec: 2 },
  'www.ebi.ac.uk': { capacity: 10, refillPerSec: 5 },
  'api.fda.gov': { capacity: 6, refillPerSec: 3 },
  'clinicaltrials.gov': { capacity: 6, refillPerSec: 3 },
  default: { capacity: 12, refillPerSec: 6 },
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return 'default'
  }
}

function getConfig(host: string): RateLimitConfig {
  return HOST_LIMITS[host] ?? HOST_LIMITS.default
}

/**
 * Wait until a token is available for this URL's host, then consume one.
 * Max wait ~5s then proceeds anyway (degrades under load rather than hanging forever).
 */
export async function acquireRateLimit(url: string): Promise<void> {
  const host = hostFromUrl(url)
  const cfg = getConfig(host)
  const now = Date.now()
  let bucket = buckets.get(host)
  if (!bucket) {
    bucket = { tokens: cfg.capacity, lastRefill: now }
    buckets.set(host, bucket)
  }

  const elapsed = (now - bucket.lastRefill) / 1000
  bucket.tokens = Math.min(cfg.capacity, bucket.tokens + elapsed * cfg.refillPerSec)
  bucket.lastRefill = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return
  }

  const need = 1 - bucket.tokens
  const waitMs = Math.min(5000, Math.ceil((need / cfg.refillPerSec) * 1000))
  await new Promise((r) => setTimeout(r, waitMs))
  bucket.tokens = Math.max(0, bucket.tokens + (waitMs / 1000) * cfg.refillPerSec - 1)
  bucket.lastRefill = Date.now()
}

/** Test helper */
export function resetRateLimitBuckets(): void {
  buckets.clear()
}
