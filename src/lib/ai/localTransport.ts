/**
 * Decide whether Ollama should be reached from the browser (user's machine)
 * vs the Next.js server (App Hosting / SSR proxy).
 *
 * Hosted HTTPS cannot open http://127.0.0.1 or http://localhost (mixed content —
 * both are treated the same by browsers). Local npm run dev on http:// can.
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

/** True when this browser page may call http://loopback without mixed-content block. */
export function canBrowserCallLocalHttp(): boolean {
  if (typeof window === 'undefined') return false
  // http://localhost:3000 → http://127.0.0.1:11434 is fine
  if (window.location.protocol === 'http:') return true
  // https://… → http://127.0.0.1 or http://localhost are both mixed content (blocked)
  return false
}

/**
 * Use browser → Ollama for loopback/LAN so traffic hits the user's PC, not App Hosting.
 * Cloud always stays on the server (API key never exposed to third parties except ollama.com via our proxy).
 */
export function shouldUseBrowserOllama(url: string): boolean {
  if (typeof window === 'undefined') return false
  if (!isLocalOrLanOllamaUrl(url)) return false
  // Even on HTTPS we still *attempt* browser path so we can surface a precise error;
  // canBrowserCallLocalHttp is used for messaging. Mixed content fails at fetch.
  return true
}

export function localOllamaMixedContentHint(): string {
  return (
    'This page is HTTPS, so the browser blocks all http:// loopback addresses — ' +
    'including 127.0.0.1:11434 and localhost:11434 (same mixed-content rule; the name does not matter). ' +
    'To use Ollama on your PC: run npm run dev, open http://localhost:3000 (HTTP, not this HTTPS site), ' +
    'then click “Use my Ollama (11434)”. On this hosted site, use Ollama Cloud with your API key instead.'
  )
}

export function localOllamaCorsHint(): string {
  return (
    'Browser could not reach Ollama (CORS or network). On your PC set OLLAMA_ORIGINS=* and restart Ollama, e.g. ' +
    'PowerShell: $env:OLLAMA_ORIGINS="*"; ollama serve'
  )
}
