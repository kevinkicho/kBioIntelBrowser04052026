import type { IntersectedMatch } from './types'

/**
 * RFC-4180-ish escape: wrap in double-quotes and double-up internal quotes
 * if the value contains a comma, quote, or newline.
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Pure CSV export for intersected hypothesis results.
 *
 * Format: header row + one row per match. Reasons are joined with "; "
 * inside a single quoted cell so the row count equals the molecule count.
 */
export function exportMatchesToCsv(matches: IntersectedMatch[]): string {
  const header = ['name', 'cid', 'reasons'].join(',')
  if (matches.length === 0) return header

  const rows = matches.map(m => [
    escapeCsvValue(m.name),
    escapeCsvValue(m.cid),
    escapeCsvValue(m.reasons.join('; ')),
  ].join(','))

  return [header, ...rows].join('\n')
}
