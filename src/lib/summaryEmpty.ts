/**
 * Shared empty/data helpers for summary cards, panels, and status chrome.
 * Use so “0 / null / —” is always quieter than real signal (opacity-20).
 */

export const EMPTY_DATA_OPACITY_CLASS = 'opacity-20'

/** True when a metric/value should be treated as empty (dimmed). */
export function isEmptyMetric(value: number | string | null | undefined): boolean {
  if (value == null) return true
  if (typeof value === 'number') return !Number.isFinite(value) || value === 0
  const s = String(value).trim()
  if (!s) return true
  if (s === '0' || s === '—' || s === '–' || s === '-' || s === 'n/a' || s === 'N/A') return true
  // Phase breakdown strings that collapsed to nothing
  if (/^[\s·P0-9:]*$/.test(s) && !/\d*[1-9]\d*/.test(s)) return true
  return false
}

/** @deprecated Prefer isEmptyMetric — alias for summary cards */
export const isEmptySummaryValue = isEmptyMetric

export interface SummaryCardLike {
  primaryValue: number | string | null | undefined
  secondaryMetrics?: Array<{ value: number | string | null | undefined }>
}

/** True when a summary card has at least one non-empty primary or secondary value. */
export function summaryCardHasData(card: SummaryCardLike): boolean {
  if (!isEmptyMetric(card.primaryValue)) return true
  return (card.secondaryMetrics ?? []).some((m) => !isEmptyMetric(m.value))
}

/**
 * Panel/list “has data” contract: non-empty array, or non-null object with content.
 * Empty array / null / undefined → no data.
 */
export function panelHasData(value: unknown): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'number') return !isEmptyMetric(value)
  if (typeof value === 'string') return !isEmptyMetric(value)
  if (typeof value === 'object') {
    // Treat plain empty object as no data
    return Object.keys(value as object).length > 0
  }
  return Boolean(value)
}

/** CSS class when a card/row should be dimmed for empty data. */
export function emptyDataClass(isEmpty: boolean): string {
  return isEmpty ? EMPTY_DATA_OPACITY_CLASS : ''
}
