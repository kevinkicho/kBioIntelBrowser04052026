/** Safe parse helpers for free-API payloads. */

export function safeLen(val: unknown): number {
  return Array.isArray(val) ? val.length : 0
}

export function safeArr(val: unknown): Record<string, unknown>[] {
  return Array.isArray(val) ? val : []
}

/**
 * Coerce to string and strip HTML/highlight markup from free-API payloads
 * (e.g. Reactome returns <span class="highlighting">Lysine</span>).
 * Always plain text for brief UI (never dangerouslySetInnerHTML).
 */
export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function safeStr(val: unknown): string {
  if (typeof val === 'string') return stripHtml(val)
  if (typeof val === 'number' && Number.isFinite(val)) return String(val)
  return ''
}

export function uniqStrings(arr: unknown[], key: string, limit: number = 10): string[] {
  const items = safeArr(arr)
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const v = safeStr((item as Record<string, unknown>)?.[key])
    if (v && !seen.has(v) && result.length < limit) {
      seen.add(v)
      result.push(v)
    }
  }
  return result
}
