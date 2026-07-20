/**
 * Minimal XLSX (OOXML) first-sheet reader for EMA medicine bulk tables.
 * Handles shared strings + inline strings; enough for official EMA Excel dumps.
 */

import { readZipTextEntry } from './readZipText'

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = []
  // <si>...</si> blocks; text may be split across <t> runs
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/gi
  let m: RegExpExecArray | null
  while ((m = siRe.exec(xml))) {
    const block = m[1]
    const texts: string[] = []
    const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi
    let tm: RegExpExecArray | null
    while ((tm = tRe.exec(block))) {
      texts.push(decodeXmlEntities(tm[1]))
    }
    out.push(texts.join(''))
  }
  return out
}

/** A1 → 0-based column index */
function colLettersToIndex(col: string): number {
  let n = 0
  for (let i = 0; i < col.length; i++) {
    const c = col.charCodeAt(i)
    if (c < 65 || c > 90) break
    n = n * 26 + (c - 64)
  }
  return n - 1
}

/** Max densified columns — EMA dumps include far-right spacer cols (e.g. AMJ ≈ 1024). */
const MAX_SHEET_COLS = 96

/**
 * Parse first worksheet of an xlsx buffer into string[][] (sparse rows densified).
 */
export function parseXlsxFirstSheet(buffer: Buffer): string[][] {
  const sharedXml = readZipTextEntry(buffer, 'xl/sharedStrings.xml') || ''
  const shared = sharedXml ? parseSharedStrings(sharedXml) : []
  const sheetXml = readZipTextEntry(buffer, 'xl/worksheets/sheet1.xml')
  if (!sheetXml) return []

  const rows: string[][] = []
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi
  let rm: RegExpExecArray | null
  while ((rm = rowRe.exec(sheetXml))) {
    const rowXml = rm[1]
    const cells = new Map<number, string>()
    let maxCol = -1
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gi
    let cm: RegExpExecArray | null
    while ((cm = cellRe.exec(rowXml))) {
      const attrs = cm[1] || cm[3] || ''
      const body = cm[2] || ''
      const refM = /\br="([A-Z]+)(\d+)"/i.exec(attrs)
      if (!refM) continue
      const col = colLettersToIndex(refM[1].toUpperCase())
      if (col < 0 || col >= MAX_SHEET_COLS) continue
      maxCol = Math.max(maxCol, col)
      const typeM = /\bt="([^"]+)"/.exec(attrs)
      const t = typeM?.[1] || ''
      let val = ''
      if (t === 's') {
        const vM = /<v>([\s\S]*?)<\/v>/.exec(body)
        const idx = vM ? parseInt(vM[1], 10) : NaN
        val = Number.isFinite(idx) ? shared[idx] ?? '' : ''
      } else if (t === 'inlineStr') {
        const tM = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/.exec(body)
        val = tM ? decodeXmlEntities(tM[1]) : ''
      } else {
        const vM = /<v>([\s\S]*?)<\/v>/.exec(body)
        val = vM ? decodeXmlEntities(vM[1]) : ''
      }
      cells.set(col, val)
    }
    if (maxCol < 0) {
      rows.push([])
      continue
    }
    const arr: string[] = []
    for (let c = 0; c <= maxCol; c++) arr.push(cells.get(c) ?? '')
    rows.push(arr)
  }
  return rows
}
