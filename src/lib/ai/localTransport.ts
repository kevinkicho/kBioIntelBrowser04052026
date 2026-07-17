/**
 * Decide whether Ollama should be reached from the browser (user's machine)
 * vs the Next.js server (App Hosting / SSR proxy).
 *
 * Hosted HTTPS pages cannot fetch http://127.0.0.1 (mixed content). Workarounds:
 * - Browser → local Ollama when the *page* is HTTP (e.g. local dev)
 * - Browser → https:// tunnel pointing at the user's :11434 (works on hosted site)
 * - Ollama Cloud via server proxy + user API key
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
 * Reach Ollama from the browser (not App Hosting) for:
 * - loopback / LAN
 * - user HTTPS tunnels to their machine
 */
export function shouldUseBrowserOllama(url: string): boolean {
  if (typeof window === 'undefined') return false
  if (isOllamaCloudUrl(url)) return false
  return isLocalOrLanOllamaUrl(url) || isBrowserTunnelOllamaUrl(url)
}

export function localOllamaMixedContentHint(): string {
  return (
    'This site is HTTPS, so the browser blocks http://127.0.0.1:11434 and http://localhost:11434 ' +
    '(mixed content — 127.0.0.1 is not a special case). ' +
    'To use models on your PC from this site: either (1) Use Cloud with your Ollama API key, or ' +
    '(2) expose Ollama with an HTTPS tunnel to port 11434 (e.g. cloudflared) and paste that https:// URL as host. ' +
    'Set OLLAMA_ORIGINS=* so the browser is allowed to call it.'
  )
}

export function localOllamaCorsHint(): string {
  return (
    'Browser could not reach Ollama (CORS or network). On the machine running Ollama: ' +
    '$env:OLLAMA_ORIGINS="*"; ollama serve  (or export OLLAMA_ORIGINS=*)'
  )
}
