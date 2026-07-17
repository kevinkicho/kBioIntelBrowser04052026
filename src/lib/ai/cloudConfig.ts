/**
 * Server-only Ollama Cloud configuration.
 * Prefer per-request user API key; fall back to process.env.OLLAMA_API_KEY.
 *
 * IMPORTANT: Use dynamic env lookup so Next.js does not bake `undefined` into
 * the server bundle when OLLAMA_API_KEY is only available at App Hosting RUNTIME.
 */

function envGet(name: string): string | undefined {
  // Bracket access + runtime read — avoids static inlining of missing BUILD secrets
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

/** Server env key only (App Hosting secret). Prefer resolveOllamaApiKey(userKey). */
export function getOllamaApiKey(): string | undefined {
  return envGet('OLLAMA_API_KEY')
}

/**
 * User-provided key wins; otherwise server env.
 * Never log the returned value.
 */
export function resolveOllamaApiKey(userKey?: string | null): string | undefined {
  if (typeof userKey === 'string') {
    const t = userKey.trim()
    if (t.length > 0) return t
  }
  return getOllamaApiKey()
}

/** True when a cloud API key is available (user or server env). */
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

/** Authorization headers for ollama.com; empty for local/LAN URLs. */
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
