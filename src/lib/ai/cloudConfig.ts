/**
 * Server-only Ollama Cloud configuration.
 * API key is read from process.env at call time (never expose to the client).
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

export function getOllamaApiKey(): string | undefined {
  return envGet('OLLAMA_API_KEY')
}

/** True when a cloud API key is configured for fallback. */
export function hasOllamaCloudFallback(): boolean {
  return Boolean(getOllamaApiKey())
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
export function getCloudAuthHeaders(url: string): Record<string, string> {
  if (!isOllamaCloudUrl(url)) return {}
  const key = getOllamaApiKey()
  if (!key) return {}
  return { Authorization: `Bearer ${key}` }
}

export function ollamaRequestHeaders(
  url: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    Accept: 'application/json',
    ...extra,
    ...getCloudAuthHeaders(url),
  }
}
