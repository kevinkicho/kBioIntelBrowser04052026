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

export const OLLAMA_DEFAULT_PORT = 11434

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

function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase())
}

/** RFC1918 private LAN + .local mDNS hostnames */
export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (/^10\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/\.(local|localdomain)$/.test(h)) return true
  return false
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (isLoopbackHostname(h)) return false
  if (/^\[::1\]$/.test(h)) return false
  if (/^\[::ffff:127\.0\.0\.1\]$/i.test(h)) return false
  if (/^\[::ffff:/i.test(h)) return true
  if (/^\[fc/i.test(h) || /^\[fd/i.test(h)) return true
  if (/^\[fe80:/i.test(h)) return true
  if (/^\[::\]$/.test(h)) return true
  if (/^\[0:/.test(h)) return true
  if (/^0\./.test(h) || h === '0.0.0.0') return true
  if (/^169\.254\./.test(h)) return true
  if (/^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./.test(h)) return true
  if (/^198\.51\.100\./.test(h)) return true
  if (/^203\.0\.113\./.test(h)) return true
  if (/^(0x[0-9a-f]+|0[0-7]+)\.?/i.test(h)) return true
  if (/^\d{10,}$/.test(h)) return true
  return false
}

export type ValidationWarning = 'lan-warning'

export interface ValidateOllamaUrlOptions {
  /**
   * When true (server AI routes), only loopback is allowed by default.
   * Private LAN hosts require OLLAMA_ALLOW_LAN=1 in the environment.
   * Public hostnames are always rejected in server mode (SSRF / open proxy).
   */
  forServer?: boolean
}

/**
 * Whether the server process allows private LAN Ollama hosts.
 * Set OLLAMA_ALLOW_LAN=1 (or true) when Ollama runs on another machine on your network.
 */
export function isLanOllamaAllowed(): boolean {
  const v = (process.env.OLLAMA_ALLOW_LAN || '').toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

export function validateOllamaUrl(
  url: string,
  options: ValidateOllamaUrlOptions = {},
): { valid: boolean; error?: string; normalized?: string; warning?: ValidationWarning } {
  let normalized = url.trim().replace(/\/+$/, '')
  if (!normalized) return { valid: false, error: 'No Ollama URL provided' }
  const originalLower = normalized.toLowerCase()
  if (originalLower.startsWith('http://') || originalLower.startsWith('https://')) {
    // keep as-is
  } else if (originalLower.includes('://')) {
    return { valid: false, error: 'Only http: and https: protocols are allowed' }
  } else {
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
    return { valid: false, error: 'Reserved IP addresses are not allowed' }
  }

  // Cloud hosts: never invent :11434 (HTTPS 443 / default)
  if (isOllamaCloudHostname(hostname)) {
    const cloudNorm = normalizeOllamaUrl(`${parsed.protocol}//${hostname}`)
    return { valid: true, normalized: cloudNorm }
  }

  if (!parsed.port) {
    normalized = `${parsed.protocol}//${parsed.host}:${OLLAMA_DEFAULT_PORT}`
    parsed = new URL(normalized)
  }
  const port = parsed.port || String(OLLAMA_DEFAULT_PORT)
  const portNum = parseInt(port, 10)
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return { valid: false, error: 'Invalid port number (1-65535)' }
  }

  const loopback = isLoopbackHostname(hostname)
  const privateHost = isPrivateHostname(hostname)

  if (options.forServer) {
    if (loopback) {
      return { valid: true, normalized: `${parsed.protocol}//${hostname}:${port}` }
    }
    if (privateHost) {
      if (!isLanOllamaAllowed()) {
        return {
          valid: false,
          error:
            'LAN Ollama hosts are disabled on the server. Set OLLAMA_ALLOW_LAN=1 to allow private network addresses.',
        }
      }
      return {
        valid: true,
        normalized: `${parsed.protocol}//${hostname}:${port}`,
        warning: 'lan-warning',
      }
    }
    // Other public hostnames: never proxy from untrusted clients (SSRF)
    return {
      valid: false,
      error:
        'Only localhost, private LAN (with OLLAMA_ALLOW_LAN=1), or Ollama Cloud is allowed for server-side Ollama',
    }
  }

  // Client mode: loopback + private LAN (with warning). Cloud handled above.
  if (!loopback && !privateHost) {
    return {
      valid: false,
      error: 'Only localhost, private LAN (10.x, 172.16-31.x, 192.168.x, *.local), or ollama.com are allowed',
    }
  }

  const warning: ValidationWarning | undefined = !loopback ? 'lan-warning' : undefined
  return { valid: true, normalized: `${parsed.protocol}//${hostname}:${port}`, warning }
}

/** Hosts that speak the Ollama HTTP API on standard HTTPS (not :11434). */
function isOllamaCloudHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === 'ollama.com' || h === 'www.ollama.com' || h === 'api.ollama.com'
}

/**
 * Normalize an Ollama base URL.
 * - Local/LAN HTTP installs default to port 11434 when omitted.
 * - HTTPS (incl. Ollama Cloud) must NOT get :11434 — that breaks cloud fallback
 *   (https://ollama.com:11434 is unreachable from App Hosting).
 */
export function normalizeOllamaUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, '')
  if (normalized && !normalized.startsWith('http')) {
    normalized = `http://${normalized}`
  }
  if (normalized) {
    try {
      const parsed = new URL(normalized)
      const host = parsed.hostname.toLowerCase()
      // Strip mistaken :11434 on cloud hosts (saved from older clients / bugs)
      if (
        isOllamaCloudHostname(host) &&
        (parsed.port === String(OLLAMA_DEFAULT_PORT) || parsed.port === '11434')
      ) {
        return `${parsed.protocol}//${host}`
      }
      if (!parsed.port) {
        if (parsed.protocol === 'https:' || isOllamaCloudHostname(host)) {
          return `${parsed.protocol}//${host}`
        }
        // Local Ollama default listen port
        return `${parsed.protocol}//${parsed.hostname}:${OLLAMA_DEFAULT_PORT}`
      }
    } catch {
      /* keep as-is */
    }
  }
  return normalized
}

export function pickFirstModel(availableModels: string[]): string | null {
  if (availableModels.length > 0) return availableModels[0]
  return null
}
