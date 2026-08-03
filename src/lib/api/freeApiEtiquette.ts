/**
 * Free-API etiquette constants + helpers for the freeApiAgent runtime.
 *
 * Product law: of-record data is free public HTTP only.
 * This module does NOT invent facts — it only polices how we request them
 * so we do not trip rate limits (429) or violate host norms.
 */

/** Identifiable UA — many free APIs require contactable User-Agent / mailto. */
export const FREE_API_USER_AGENT =
  process.env.BIOINTEL_HTTP_USER_AGENT ||
  'BioIntel/0.1 (research workbench; free-API etiquette; +https://github.com/kevinkicho/kBioIntelBrowser04052026)'

/** Polite Accept defaults for JSON free APIs. */
export const FREE_API_ACCEPT = 'application/json, text/plain;q=0.9, */*;q=0.1'

/**
 * Merge etiquette headers without clobbering caller overrides.
 * Always ensures User-Agent + Accept when missing.
 */
export function politeHeaders(extra?: HeadersInit): Headers {
  const h = new Headers(extra)
  if (!h.has('User-Agent') && !h.has('user-agent')) {
    h.set('User-Agent', FREE_API_USER_AGENT)
  }
  if (!h.has('Accept') && !h.has('accept')) {
    h.set('Accept', FREE_API_ACCEPT)
  }
  // OpenAlex / polite pool prefer mailto in User-Agent or From
  if (!h.has('From') && !h.has('from') && process.env.NCBI_EMAIL) {
    h.set('From', process.env.NCBI_EMAIL)
  }
  return h
}

/** Error thrown / annotated when upstream rate-limits us. */
export class FreeApiRateLimitError extends Error {
  readonly status = 429
  readonly retryAfterMs: number
  readonly source?: string

  constructor(message: string, retryAfterMs: number, source?: string) {
    super(message)
    this.name = 'FreeApiRateLimitError'
    this.retryAfterMs = retryAfterMs
    this.source = source
  }
}

export function isRateLimitError(err: unknown): err is FreeApiRateLimitError | (Error & { status: number }) {
  if (err instanceof FreeApiRateLimitError) return true
  if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 429) {
    return true
  }
  if (err instanceof Error && /HTTP\s*429|rate\s*limit|too many requests/i.test(err.message)) {
    return true
  }
  return false
}

export function retryAfterMsFromError(err: unknown): number | undefined {
  if (err instanceof FreeApiRateLimitError) return err.retryAfterMs
  if (err && typeof err === 'object' && 'retryAfterMs' in err) {
    const n = Number((err as { retryAfterMs: unknown }).retryAfterMs)
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}
