/**
 * Coerce untrusted API / DTO fields into React-safe display strings.
 * Prevents React error #31 (objects as children) when free APIs return nested shapes.
 */

export type SafeDisplayOptions = {
  /** Fallback when empty / unusable. Default: "—" */
  empty?: string
  /** Max characters (ellipsis). 0 = no limit. */
  maxLen?: number
}

/**
 * Convert unknown values to a string safe to put in JSX text nodes.
 * Objects (including UniProt proteinDescription shapes) never pass through as React children.
 */
export function safeDisplayString(
  value: unknown,
  opts: SafeDisplayOptions = {},
): string {
  const empty = opts.empty ?? '—'
  if (value == null) return empty
  if (typeof value === 'string') {
    const t = value.trim()
    return t ? clamp(t, opts.maxLen) : empty
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return empty
    return clamp(String(value), opts.maxLen)
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'bigint') return clamp(value.toString(), opts.maxLen)

  // Nested free-API name bags (UniProt, etc.)
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    // UniProt recommendedName.fullName.value
    const rec = digString(o, ['recommendedName', 'fullName', 'value'])
    if (rec) return clamp(rec, opts.maxLen)
    const alt = digString(o, ['alternativeNames', '0', 'fullName', 'value'])
    if (alt) return clamp(alt, opts.maxLen)
    // Common wrappers
    for (const k of ['value', 'name', 'label', 'title', 'fullName', 'displayName']) {
      const v = o[k]
      if (typeof v === 'string' && v.trim()) return clamp(v.trim(), opts.maxLen)
      if (v && typeof v === 'object') {
        const nested = digString(v as Record<string, unknown>, ['value'])
        if (nested) return clamp(nested, opts.maxLen)
      }
    }
    // Never JSON.stringify large blobs into UI by default — prefer empty marker
    return empty
  }

  return empty
}

/** True when value is a plain object that would crash React if rendered as a child. */
export function isUnsafeReactChild(value: unknown): boolean {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    // React elements are objects but are valid children — skip those
    !(value as { $$typeof?: unknown }).$$typeof
  )
}

function digString(obj: Record<string, unknown>, path: string[]): string | null {
  let cur: unknown = obj
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return null
    if (key === '0' && Array.isArray(cur)) {
      cur = cur[0]
      continue
    }
    cur = (cur as Record<string, unknown>)[key]
  }
  if (typeof cur === 'string' && cur.trim()) return cur.trim()
  return null
}

function clamp(s: string, maxLen?: number): string {
  if (!maxLen || maxLen <= 0 || s.length <= maxLen) return s
  return `${s.slice(0, Math.max(1, maxLen - 1))}…`
}
