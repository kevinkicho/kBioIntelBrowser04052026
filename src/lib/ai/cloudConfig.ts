/**
 * Server-side Ollama Cloud configuration.
 * API keys come from the user's request (UI-stored key) only — no server env fallback.
 */

function envGet(name: string): string | undefined {
  try {
    const v = (process.env as Record<string, string | undefined>)[name]
    if (typeof v !== 'string') return undefined
    const t = v.trim()
    return t.length > 0 ? t : undefined
  } catch {
    return undefined
  }
}

export function getOllamaCloudBase(): string {
  return (envGet('OLLAMA_CLOUD_BASE_URL') || 'https://ollama.com').replace(
    /\/+$/,
    '',
  )
}

/** @deprecated use getOllamaCloudBase() — kept for import compatibility */
export const OLLAMA_CLOUD_BASE = 'https://ollama.com'

/**
 * Server env shared key — disabled. Users must provide their own Ollama Cloud key.
 * Kept as a no-op so older call sites compile.
 */
export function getOllamaApiKey(): string | undefined {
  return undefined
}

/**
 * Only the user-provided key (request body / browser storage). Never use a shared server secret.
 * Never log the returned value.
 */
export function resolveOllamaApiKey(userKey?: string | null): string | undefined {
  if (typeof userKey === 'string') {
    const t = userKey.trim()
    if (t.length > 0) return t
  }
  return undefined
}

/** True when a user API key is present on this request. */
export function hasOllamaCloudFallback(userKey?: string | null): boolean {
  return Boolean(resolveOllamaApiKey(userKey))
}

export function isOllamaCloudUrl(url: string): boolean {
  try {
    const raw = url.includes('://') ? url : `https://${url}`
    const host = new URL(raw).hostname.toLowerCase()
    return host === 'ollama.com' || host === 'www.ollama.com' || host === 'api.ollama.com'
  } catch {
    return false
  }
}

/** Authorization headers for ollama.com; empty without a user key. */
export function getCloudAuthHeaders(
  url: string,
  userKey?: string | null,
): Record<string, string> {
  if (!isOllamaCloudUrl(url)) return {}
  const key = resolveOllamaApiKey(userKey)
  if (!key) return {}
  return { Authorization: `Bearer ${key}` }
}

export function ollamaRequestHeaders(
  url: string,
  extra: Record<string, string> = {},
  userKey?: string | null,
): Record<string, string> {
  return {
    Accept: 'application/json',
    ...extra,
    ...getCloudAuthHeaders(url, userKey),
  }
}

/** Parse optional ollamaApiKey / apiKey from a request JSON body. */
export function parseRequestOllamaApiKey(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const o = body as Record<string, unknown>
  const raw = o.ollamaApiKey ?? o.apiKey
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  return t.length > 0 ? t : undefined
}
