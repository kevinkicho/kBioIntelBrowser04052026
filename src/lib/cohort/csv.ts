/**
 * Cohort matrix CSV export.
 *
 * Layout:
 *   first column = attribute label
 *   following columns = one per molecule (header row carries "Name (CID)")
 *
 * Numeric cells round-trip cleanly into Excel/Google Sheets; null cells stay
 * empty. We use the same RFC-4180-ish escape as `hypothesis/csv.ts`.
 */
import type { MatrixRow, Molecule } from './types'

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportCohortToCsv(molecules: Molecule[], rows: MatrixRow[]): string {
  const header = ['Attribute', ...molecules.map(m => `${m.name} (CID ${m.cid})`)]
    .map(escapeCsvValue)
    .join(',')

  if (rows.length === 0) return header

  const lines = rows.map(row => {
    const cellValues = row.cells.map(c => {
      if (c.value === null || c.value === undefined) return ''
      if (typeof c.value === 'number') return String(c.value)
      return c.value
    })
    return [row.attribute.label, ...cellValues].map(escapeCsvValue).join(',')
  })

  return [header, ...lines].join('\n')
}

export function exportCohortToJson(molecules: Molecule[], rows: MatrixRow[]): string {
  const payload = {
    molecules,
    rows: rows.map(r => ({
      id: r.attribute.id,
      label: r.attribute.label,
      category: r.attribute.category,
      format: r.attribute.format,
      values: r.cells.map(c => c.value),
      heat: r.cells.map(c => c.heat),
      variance: r.variance,
    })),
  }
  return JSON.stringify(payload, null, 2)
}
