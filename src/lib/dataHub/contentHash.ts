/**
 * Content-addressable hashes for of-record hub ledgers and kits.
 * Enables reproducible re-open / kit diff without inventing facts.
 */

import type { DataHubLedger, DataHubRow } from './types'
import { isDataHubValueEmpty } from './types'

/** Stable FNV-1a 32-bit hex (no crypto dependency). */
export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function canonicalHubFactLine(r: DataHubRow): string {
  return [
    r.id,
    r.fact,
    isDataHubValueEmpty(r.value) ? '—' : r.value.trim(),
    r.source || '',
    r.sourceUrl || '',
    r.domain || '',
  ].join('\t')
}

/** Hash of non-empty of-record facts only (order by id). */
export function hashDataHubLedger(ledger: DataHubLedger): string {
  const lines = ledger.rows
    .filter((r) => !isDataHubValueEmpty(r.value))
    .map(canonicalHubFactLine)
    .sort()
  const body = [
    `subject:${ledger.subjectId}`,
    `label:${ledger.subjectLabel}`,
    ...lines,
  ].join('\n')
  return `hub_${fnv1aHex(body)}_${lines.length}`
}

export function hashStringBlob(s: string): string {
  return `blob_${fnv1aHex(s)}_${s.length}`
}
