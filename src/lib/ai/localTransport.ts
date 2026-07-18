/**
 * Decide whether Ollama should be reached from the browser (user's machine)
 * vs the Next.js App Hosting server proxy (`/api/ai/*`).
 *
 * Architecture (hosted HTTPS):
 *   Browser → same-origin `/api/ai/*` → Ollama Cloud (or HTTPS tunnel URL)
 *
 * Hosted HTTPS pages **cannot** fetch http://127.0.0.1 (mixed content).
 * App Hosting / Firebase Functions also **cannot** reach the user's PC loopback.
 * So "local Ollama" only works when the *page* is HTTP (npm run dev) or the user
 * pastes an HTTPS tunnel URL.
 */

import { isPrivateHostname, normalizeOllamaUrl } from './config'
import { isOllamaCloudUrl } from './cloudConfig'

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1'])

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK.has(hostname.toLowerCase())
}

export function isLocalOrLanOllamaUrl(url: string): boolean {
  if (!url?.trim()) return false
  if (isOllamaCloudUrl(url)) return false
  try {
    const raw = url.includes('://') ? url : `http://${url}`
    const u = new URL(normalizeOllamaUrl(raw) || raw)
    const h = u.hostname.toLowerCase()
    return isLoopbackHostname(h) || isPrivateHostname(h)
  } catch {
    return false
  }
}

/** Custom https endpoint (user tunnel) that is not ollama.com cloud. */
export function isBrowserTunnelOllamaUrl(url: string): boolean {
  if (!url?.trim() || isOllamaCloudUrl(url)) return false
  try {
    const raw = url.includes('://') ? url : `https://${url}`
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    const h = u.hostname.toLowerCase()
    return !isLoopbackHostname(h) && !isPrivateHostname(h)
  } catch {
    return false
  }
}

/** True when this browser page may call http://loopback without mixed-content block. */
export function canBrowserCallLocalHttp(): boolean {
  if (typeof window === 'undefined') return false
  // Only plain HTTP pages can call http://127.0.0.1:11434
  if (window.location.protocol === 'http:') return true
  return false
}

/**
 * Reach Ollama from the browser (not App Hosting server) only when the
 * browser can actually complete the request:
 * - HTTPS page + loopback/LAN → **false** (mixed content / private network)
 * - HTTP local dev + loopback/LAN → true
 * - User HTTPS tunnel → true (browser CORS to tunnel)
 * - ollama.com → **false** (always server proxy + API key)
 */
export function shouldUseBrowserOllama(url: string): boolean {
  if (typeof window === 'undefined') return false
  if (isOllamaCloudUrl(url)) return false
  if (isBrowserTunnelOllamaUrl(url)) return true
  if (isLocalOrLanOllamaUrl(url)) {
    // Critical: never attempt browser→http://127.0.0.1 from HTTPS App Hosting
    return canBrowserCallLocalHttp()
  }
  return false
}

/**
 * True when the only viable path is App Hosting `/api/ai/*` → Ollama Cloud
 * (or when local URL was requested on HTTPS and we should not dial loopback).
 */
export function mustUseServerOllamaProxy(url: string): boolean {
  if (isOllamaCloudUrl(url)) return true
  if (!url?.trim()) return true
  if (isLocalOrLanOllamaUrl(url) && !canBrowserCallLocalHttp()) return true
  return false
}

export function localOllamaMixedContentHint(): string {
  return (
    'This site is HTTPS, so the browser blocks http://127.0.0.1:11434 and http://localhost:11434 ' +
    '(mixed content). App Hosting also cannot reach your PC. ' +
    'Use (1) Ollama Cloud + API key via this site’s server (Use Cloud), or ' +
    '(2) an HTTPS tunnel to your Ollama (e.g. cloudflared) and paste the https:// URL. ' +
    'Local 11434 only works on http://localhost when you run npm run dev.'
  )
}

export function localOllamaCorsHint(): string {
  return (
    'Browser could not reach Ollama (CORS or network). On the machine running Ollama: ' +
    '$env:OLLAMA_ORIGINS="*"; ollama serve  (or export OLLAMA_ORIGINS=*)'
  )
}
