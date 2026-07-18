/**
 * Runtime environment detection (App Hosting / Cloud Run vs local dev).
 * Server-only signals — never trust client headers for security decisions.
 */

/** True when running on Cloud Run (Firebase App Hosting backend). */
export function isCloudRunRuntime(): boolean {
  // Prefer Cloud Run service vars only — do not use FIREBASE_CONFIG (set by Admin SDK locally).
  return Boolean(
    process.env.K_SERVICE || process.env.K_REVISION || process.env.CLOUD_RUN_JOB,
  )
}

/**
 * Prefer cloud-only Ollama on managed hosts (no local daemon).
 * Override with OLLAMA_ALLOW_LOCALHOST=1 for rare debug sidecars.
 */
export function shouldSkipLocalOllama(): boolean {
  const allow = (process.env.OLLAMA_ALLOW_LOCALHOST || '').toLowerCase()
  if (allow === '1' || allow === 'true' || allow === 'yes') return false
  if (isCloudRunRuntime()) return true
  // NODE_ENV=production without Cloud Run still usually has no local Ollama
  // (e.g. other hosts). Only skip loopback probes there.
  if (process.env.NODE_ENV === 'production') return true
  return false
}

export function isLoopbackOllamaUrl(url: string): boolean {
  try {
    const raw = url.includes('://') ? url : `http://${url}`
    const host = new URL(raw).hostname.toLowerCase()
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '[::1]'
    )
  } catch {
    return false
  }
}
