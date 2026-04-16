export type AIStatus = 'unknown' | 'checking' | 'available' | 'unavailable' | 'downloading' | 'error'

export interface AIConfig {
  enabled: boolean
  status: AIStatus
  model: string
  ollamaUrl: string
  availableModels: string[]
  error?: string
}

export const AI_DEFAULTS: AIConfig = {
  enabled: false,
  status: 'unknown',
  model: '',
  ollamaUrl: '',
  availableModels: [],
}

export const AI_STORAGE_KEY = 'biointel-ai-config'

export function loadAIConfig(): Partial<AIConfig> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

export function saveAIConfig(config: Partial<AIConfig>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export function clearAIConfig(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(AI_STORAGE_KEY)
  } catch {}
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function isAllowedLocalHostname(hostname: string): boolean {
  if (LOOPBACK_HOSTS.has(hostname)) return true
  return false
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()

  if (isAllowedLocalHostname(h)) return false

  if (/^10\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./.test(h)) return true
  if (/^169\.254\./.test(h)) return true
  if (/^0\./.test(h)) return true
  if (h === '0.0.0.0') return true
  if (/^198\.51\.100\./.test(h)) return true
  if (/^203\.0\.113\./.test(h)) return true

  if (/^\[::1\]$/.test(h)) return false
  if (/^\[::ffff:/i.test(h)) return true
  if (/^\[fc/i.test(h) || /^\[fd/i.test(h)) return true
  if (/^\[fe80:/i.test(h)) return true
  if (/^\[::\]$/.test(h)) return true
  if (/^\[0:/.test(h)) return true

  if (/^(0x[0-9a-f]+|0[0-7]+)\.?/i.test(h)) return true
  if (/^\d{10,}$/.test(h)) return true

  return false
}

export function validateOllamaUrl(url: string): { valid: boolean; error?: string; normalized?: string } {
  let normalized = url.trim().replace(/\/+$/, '')
  if (!normalized) return { valid: false, error: 'No Ollama URL provided' }
  if (!normalized.startsWith('http')) {
    normalized = `http://${normalized}`
  }
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only http: and https: protocols are allowed' }
  }
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with credentials are not allowed' }
  }
  const hostname = parsed.hostname.toLowerCase()
  if (isBlockedHostname(hostname)) {
    return { valid: false, error: 'Private or reserved IP addresses are not allowed. Use localhost or 127.0.0.1' }
  }
  if (!isAllowedLocalHostname(hostname)) {
    return { valid: false, error: 'Only local addresses (localhost, 127.0.0.1) are allowed' }
  }
  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80')
  const portNum = parseInt(port, 10)
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return { valid: false, error: 'Invalid port number' }
  }
  return { valid: true, normalized: `${parsed.protocol}//${hostname}:${port}` }
}

export function normalizeOllamaUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, '')
  if (normalized && !normalized.startsWith('http')) {
    normalized = `http://${normalized}`
  }
  return normalized
}

export function pickFirstModel(availableModels: string[]): string | null {
  if (availableModels.length > 0) return availableModels[0]
  return null
}