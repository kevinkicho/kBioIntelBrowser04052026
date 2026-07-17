/**
 * Firestore rejects `undefined` field values. Strip recursively before writes.
 */

export function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)).filter((v) => v !== undefined) as T
  }
  if (typeof value === 'object' && value instanceof Date) return value
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = stripUndefined(v)
    }
    return out as T
  }
  return value
}

/** Approximate JSON size in bytes (UTF-16-ish for quota checks). */
export function approxJsonBytes(value: unknown): number {
  try {
    return JSON.stringify(value).length
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

/** Firestore hard limit is 1 MiB; keep headroom. */
export const FIRESTORE_DOC_SOFT_MAX_BYTES = 900_000
