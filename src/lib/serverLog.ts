/**
 * Structured server logs for App Hosting / Cloud Logging.
 * Prefer JSON one-liners so severity filters and log-based metrics work.
 *
 * Policy:
 * - 5xx / retryable upstream → severity ERROR or WARNING
 * - Slow successful requests → severity INFO (not error spam)
 * - Optional AI unavailability → DEBUG/INFO once (use rate-limited helpers in ollama.ts)
 */

export type ServerLogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'

export interface ApiLogFields {
  route: string
  method?: string
  status?: number
  ms?: number
  /** PubChem CID or similar */
  cid?: number | string | null
  diseaseId?: string | null
  /** Free-API source key when known */
  source?: string
  retryable?: boolean
  error?: string
  /** Extra non-sensitive context */
  [key: string]: unknown
}

const SLOW_MS_DEFAULT = 8_000

function emit(severity: ServerLogSeverity, message: string, fields: Record<string, unknown>): void {
  const payload = {
    severity,
    message,
    service: 'biointel',
    ts: new Date().toISOString(),
    ...fields,
  }
  const line = JSON.stringify(payload)
  if (severity === 'ERROR') {
    console.error(line)
  } else if (severity === 'WARNING') {
    console.warn(line)
  } else {
    // INFO/DEBUG → stdout (Cloud Logging DEFAULT/INFO)
    console.log(line)
  }
}

/** Always log API outcomes that are failures or slow. */
export function logApiOutcome(fields: ApiLogFields): void {
  const status = fields.status ?? 0
  const ms = typeof fields.ms === 'number' ? fields.ms : undefined
  const slow = ms != null && ms >= SLOW_MS_DEFAULT
  const fail = status >= 500
  const clientErr = status >= 400 && status < 500

  if (fail) {
    emit('ERROR', 'api_outcome', {
      ...fields,
      kind: fields.retryable ? 'upstream_retryable' : 'server_error',
    })
    return
  }
  if (clientErr && status !== 404) {
    // 404s are common (missing molecules); skip noise. Other 4xx log as warning.
    emit('WARNING', 'api_outcome', { ...fields, kind: 'client_error' })
    return
  }
  if (slow) {
    emit('INFO', 'api_slow', { ...fields, kind: 'slow' })
  }
}

/** Explicit one-shot structured events (AI config, harvest, etc.). */
export function logServerEvent(
  severity: ServerLogSeverity,
  message: string,
  fields: Record<string, unknown> = {},
): void {
  emit(severity, message, fields)
}

/** Wrap a route handler timer. */
export function startApiTimer(): { ms: () => number } {
  const t0 = Date.now()
  return { ms: () => Date.now() - t0 }
}
