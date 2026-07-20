/**
 * Minimal RFC4180-ish CSV parser (quoted fields, commas, newlines inside quotes).
 * No external deps — used for FDA Purple Book monthly downloads.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let i = 0
  let inQuotes = false
  const s = text.replace(/^\uFEFF/, '')

  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      field = ''
      // skip fully empty trailing lines
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
      i++
      continue
    }
    field += c
    i++
  }
  row.push(field)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  return rows
}

/** Map header labels (trimmed, case-insensitive) → column index. */
export function headerIndexMap(headerRow: string[]): Map<string, number> {
  const m = new Map<string, number>()
  headerRow.forEach((h, i) => {
    m.set(h.trim().toLowerCase(), i)
  })
  return m
}

export function cellAt(row: string[], map: Map<string, number>, ...names: string[]): string {
  for (const n of names) {
    const idx = map.get(n.toLowerCase())
    if (idx != null && row[idx] != null) return String(row[idx]).trim()
  }
  return ''
}
