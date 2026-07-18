/**
 * CSV export helpers for profile/gene listviews.
 */

export function escapeCsvCell(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(
  headers: string[],
  rows: Array<Array<unknown>>,
): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ]
  return lines.join('\n')
}

/** Trigger browser download of a CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportObjectsAsCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T | string; header: string; get?: (row: T) => unknown }[],
): void {
  const headers = columns.map((c) => c.header)
  const data = rows.map((row) =>
    columns.map((c) => (c.get ? c.get(row) : row[c.key as keyof T])),
  )
  downloadCsv(filename, rowsToCsv(headers, data))
}
