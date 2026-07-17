/**
 * Per-user Ollama Cloud API key — browser local + optional Firestore under uid.
 * Never log the raw key. Server env OLLAMA_API_KEY is only a fallback when unset.
 */

export const AI_API_KEY_STORAGE_KEY = 'biointel-ai-ollama-api-key-v1'

export function loadLocalOllamaApiKey(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = localStorage.getItem(AI_API_KEY_STORAGE_KEY)
    return typeof raw === 'string' ? raw.trim() : ''
  } catch {
    return ''
  }
}

export function saveLocalOllamaApiKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    const t = key.trim()
    if (!t) {
      localStorage.removeItem(AI_API_KEY_STORAGE_KEY)
      return
    }
    localStorage.setItem(AI_API_KEY_STORAGE_KEY, t)
  } catch {
    /* quota / private mode */
  }
}

export function clearLocalOllamaApiKey(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(AI_API_KEY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Mask for UI: show last 4 chars only. */
export function maskApiKey(key: string): string {
  const t = key.trim()
  if (!t) return ''
  if (t.length <= 4) return '••••'
  return `••••••••${t.slice(-4)}`
}
