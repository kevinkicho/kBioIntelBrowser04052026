/**
 * Format a data-hub fact for clipboard citation (lab notebook / grant appendix).
 */

import type { DataHubLedger, DataHubRow } from './types'
import { isDataHubValueEmpty } from './types'

export function formatDataHubFactCitation(
  row: DataHubRow,
  opts?: {
    subjectLabel?: string
    subjectId?: string
    retrievedAt?: string
  },
): string {
  const subject =
    opts?.subjectLabel && opts?.subjectId
      ? `${opts.subjectLabel} (${opts.subjectId})`
      : opts?.subjectLabel || opts?.subjectId || 'entity'
  const when =
    row.retrievedAt ||
    opts?.retrievedAt ||
    new Date().toISOString().slice(0, 10)
  const lines = [
    `${row.fact}: ${row.value}`,
    `Subject: ${subject}`,
    `Source: ${row.source}`,
  ]
  if (row.sourceUrl) lines.push(`URL: ${row.sourceUrl}`)
  if (row.detail) lines.push(`Note: ${row.detail}`)
  lines.push(`Retrieved/session: ${when}`)
  lines.push('Via: BioIntel data hub (free public APIs; not clinical decision support)')
  return lines.join('\n')
}

export async function copyDataHubFactCitation(
  row: DataHubRow,
  opts?: Parameters<typeof formatDataHubFactCitation>[1],
): Promise<boolean> {
  const text = formatDataHubFactCitation(row, opts)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** Count non-empty facts for watermark */
export function ledgerSampleStats(ledger: DataHubLedger): {
  factCount: number
  sourceCount: number
} {
  const factCount = ledger.rows.filter((r) => !isDataHubValueEmpty(r.value)).length
  return { factCount, sourceCount: ledger.sourceCount }
}
