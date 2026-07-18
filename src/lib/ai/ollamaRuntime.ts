/**
 * Production-aware Ollama URL resolution and rate-limited logging.
 * Keeps Cloud Run logs free of localhost:11434 spam.
 */

import { getOllamaCloudBase, hasOllamaCloudFallback } from './cloudConfig'
import { normalizeOllamaUrl } from './config'
import {
  isCloudRunRuntime,
  isLoopbackOllamaUrl,
  shouldSkipLocalOllama,
} from '@/lib/runtimeEnv'
import { logServerEvent } from '@/lib/serverLog'
import type { OllamaHealthResponse } from './ollama'

const HEALTH_CACHE_TTL_MS = 90_000
const LOG_WINDOW_MS = 120_000

type CacheEntry = {
  expiresAt: number
  value: OllamaHealthResponse
  cacheKey: string
}

let healthCache: CacheEntry | null = null
let lastUnavailableLogAt = 0
let lastCheckLogAt = 0

export function healthCacheKey(url: string, hasUserKey: boolean): string {
  return `${normalizeOllamaUrl(url)}|uk=${hasUserKey ? 1 : 0}`
}

export function getCachedOllamaHealth(key: string): OllamaHealthResponse | null {
  if (!healthCache) return null
  if (healthCache.cacheKey !== key) return null
  if (Date.now() > healthCache.expiresAt) {
    healthCache = null
    return null
  }
  return healthCache.value
}

export function setCachedOllamaHealth(key: string, value: OllamaHealthResponse): void {
  healthCache = {
    cacheKey: key,
    value,
    expiresAt: Date.now() + HEALTH_CACHE_TTL_MS,
  }
}

/** Test helper */
export function clearOllamaHealthCache(): void {
  healthCache = null
  lastUnavailableLogAt = 0
  lastCheckLogAt = 0
}

/**
 * On Cloud Run / production: rewrite loopback primary URL to Ollama Cloud
 * when a cloud key exists; otherwise mark as skip-local.
 */
export function resolvePrimaryOllamaUrlForServer(
  requestedUrl: string,
  opts?: { apiKey?: string | null },
): {
  url: string
  skippedLocal: boolean
  reason?: string
} {
  const raw = (requestedUrl || '').trim()
  if (!raw) {
    if (hasOllamaCloudFallback(opts?.apiKey)) {
      return { url: getOllamaCloudBase(), skippedLocal: true, reason: 'empty_url_cloud' }
    }
    return { url: '', skippedLocal: false, reason: 'empty_url' }
  }

  const normalized = normalizeOllamaUrl(raw)
  if (shouldSkipLocalOllama() && isLoopbackOllamaUrl(normalized)) {
    if (hasOllamaCloudFallback(opts?.apiKey)) {
      return {
        url: getOllamaCloudBase(),
        skippedLocal: true,
        reason: 'cloud_run_skip_localhost',
      }
    }
    return {
      url: '',
      skippedLocal: true,
      reason: 'cloud_run_no_local_no_key',
    }
  }

  return { url: normalized, skippedLocal: false }
}

export function logOllamaCheckOnce(url: string, cloud: boolean): void {
  const now = Date.now()
  if (now - lastCheckLogAt < LOG_WINDOW_MS) return
  lastCheckLogAt = now
  logServerEvent('DEBUG', 'ollama_health_check', {
    urlHost: safeHost(url),
    cloud,
    cloudRun: isCloudRunRuntime(),
  })
}

export function logOllamaUnavailableOnce(fields: {
  url?: string
  error?: string
  viaCloud?: boolean
}): void {
  const now = Date.now()
  if (now - lastUnavailableLogAt < LOG_WINDOW_MS) return
  lastUnavailableLogAt = now
  logServerEvent('INFO', 'ollama_unavailable', {
    urlHost: fields.url ? safeHost(fields.url) : undefined,
    error: fields.error?.slice(0, 200),
    viaCloud: fields.viaCloud,
    cloudRun: isCloudRunRuntime(),
    cloudKeyConfigured: hasOllamaCloudFallback(),
  })
}

function safeHost(url: string): string {
  try {
    return new URL(url.includes('://') ? url : `http://${url}`).host
  } catch {
    return 'invalid'
  }
}
