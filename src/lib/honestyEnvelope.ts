/**
 * Honesty envelope classification — distinct empty vs timeout vs error vs data.
 * Routes set the flags; this only reads them. Bare `_sourceStatus` is not DATA.
 */

export type HonestyClass = 'DATA' | 'EMPTY' | 'TIMEOUT' | 'ERROR' | 'DISABLED'

function asObj(val: unknown): Record<string, unknown> | null {
  if (val == null || typeof val !== 'object' || Array.isArray(val)) return null
  return val as Record<string, unknown>
}

/** Wall-clock / abort timeout shell (_timeout / _partial). */
export function isTimeoutHonestyEnvelope(val: unknown): boolean {
  const obj = asObj(val)
  if (!obj) return false
  if (obj._timeout === true) return true
  if (obj._agentStatus === 'timeout') return true
  if (obj._partial === true && /timeout|timed?\s*out/i.test(String(obj._error ?? ''))) return true
  return false
}

/** Soft-empty / not-retrieved-this-session (not a timeout). */
export function isEmptyHonestEnvelope(val: unknown): boolean {
  const obj = asObj(val)
  if (!obj) return false
  if (isTimeoutHonestyEnvelope(obj)) return false
  return obj._emptyHonest === true || obj._notRetrieved === true
}

/**
 * Classify a category/pipeline/leaf honesty envelope from its flags.
 * Returns null when no honesty flags are present (caller checks real rows).
 * Bare `_sourceStatus` alone is not DATA.
 */
export function classifyHonestyEnvelope(val: unknown): HonestyClass | null {
  const obj = asObj(val)
  if (!obj) return null

  if (obj._agentStatus === 'disabled') return 'DISABLED'
  if (isTimeoutHonestyEnvelope(obj)) return 'TIMEOUT'
  if (isEmptyHonestEnvelope(obj)) return 'EMPTY'
  if (obj._agentStatus === 'error') return 'ERROR'
  return null
}

/** Timeout and empty-as-success must not be stored as full success. */
export function shouldCacheHonestyEnvelope(val: unknown): boolean {
  const kind = classifyHonestyEnvelope(val)
  if (kind === 'TIMEOUT' || kind === 'EMPTY' || kind === 'ERROR' || kind === 'DISABLED') {
    return false
  }
  return true
}
