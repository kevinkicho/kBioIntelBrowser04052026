/**
 * Server-only Ollama Cloud configuration.
 * API key is read from process.env (never expose to the client via next.config env).
 */

export const OLLAMA_CLOUD_BASE = (
  process.env.OLLAMA_CLOUD_BASE_URL || 'https://ollama.com'
).replace(/\/+$/, '')

export function getOllamaApiKey(): string | undefined {
  const key = process.env.OLLAMA_API_KEY?.trim()
  return key || undefined
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
