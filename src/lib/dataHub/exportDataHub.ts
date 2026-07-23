/**
 * Serialize Data Hub ledgers for lab notebooks (CSV / TSV).
 * Pure — no DOM. Use with downloadFile from exportData for browser save.
 */

import type { DataHubLedger, DataHubRow } from './types'
import { isDataHubValueEmpty } from './types'

export type DataHubExportFormat = 'csv' | 'tsv'

const HEADERS = [
  'section',
  'fact',
  'value',
  'source',
  'sourceUrl',
  'panelId',
  'categoryId',
  'domain',
  'detail',
] as const

function escapeCell(raw: string, delim: string): string {
  const needs =
    raw.includes(delim) ||
    raw.includes('"') ||
    raw.includes('\n') ||
    raw.includes('\r')
  if (!needs) return raw
  return `"${raw.replace(/"/g, '""')}"`
}

function sectionTitleForRow(ledger: DataHubLedger, rowId: string): string {
  for (const s of ledger.sections) {
    if (s.rowIds.includes(rowId)) return s.title
  }
  return ''
}

export function dataHubRowsForExport(
  ledger: DataHubLedger,
  opts?: { includeEmpty?: boolean },
): Array<DataHubRow & { section: string }> {
  const includeEmpty = opts?.includeEmpty === true
  return ledger.rows
    .filter((r) => includeEmpty || !isDataHubValueEmpty(r.value))
    .map((r) => ({
      ...r,
      section: sectionTitleForRow(ledger, r.id),
    }))
}

/** UTF-8 text body for CSV or TSV (with BOM for Excel-friendly CSV). */
export function dataHubToDelimited(
  ledger: DataHubLedger,
  format: DataHubExportFormat,
  opts?: { includeEmpty?: boolean },
): string {
  const delim = format === 'tsv' ? '\t' : ','
  const rows = dataHubRowsForExport(ledger, opts)
  const lines: string[] = [HEADERS.join(delim)]
  for (const r of rows) {
    const cells = [
      r.section,
      r.fact,
      r.value,
      r.source,
      r.sourceUrl || '',
      r.panelId || '',
      r.categoryId || '',
      r.domain,
      r.detail || '',
    ].map((c) => escapeCell(String(c ?? ''), delim))
    lines.push(cells.join(delim))
  }
  const body = lines.join('\n')
  // BOM helps Excel open UTF-8 CSV correctly
  return format === 'csv' ? `\uFEFF${body}` : body
}

export function dataHubExportFilename(
  ledger: DataHubLedger,
  format: DataHubExportFormat,
): string {
  const slug = (ledger.subjectLabel || ledger.subjectId || 'entity')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const id = ledger.subjectId.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24)
  return `biointel-data-hub-${slug || 'entity'}-${id || 'id'}.${format}`
}

export function dataHubMime(format: DataHubExportFormat): string {
  return format === 'tsv' ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8'
}
