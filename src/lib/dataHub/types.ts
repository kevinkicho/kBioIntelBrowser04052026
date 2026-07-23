/**
 * Data Hub ledger contract — factual multi-source presentation.
 * Each row is a retrieved public-API fact with provenance (not model narrative).
 */

export type DataHubDomain =
  | 'identity'
  | 'chemistry'
  | 'regulatory'
  | 'clinical'
  | 'targets'
  | 'safety'
  | 'literature'
  | 'other'

export interface DataHubRow {
  id: string
  /** Short fact name shown in the Fact column */
  fact: string
  /** Display value — never invent; use "—" when unknown */
  value: string
  /** Free public source label */
  source: string
  /** Policy-safe deep link to source record when available */
  sourceUrl?: string
  /** Profile panel to open for the full siloed table */
  panelId?: string
  categoryId?: string
  domain: DataHubDomain
  /** Optional secondary line (units, NCT id, phase, etc.) */
  detail?: string
  /** ISO timestamp when known from payload / fetch */
  retrievedAt?: string
}

export interface DataHubSection {
  id: string
  title: string
  domain: DataHubDomain
  rowIds: string[]
}

export interface DataHubLedger {
  subjectId: string
  subjectLabel: string
  rows: DataHubRow[]
  sections: DataHubSection[]
  /** Distinct sources contributing at least one non-empty value */
  sourceCount: number
  empty: boolean
  notes: string[]
}

export function isDataHubValueEmpty(value: string | null | undefined): boolean {
  if (value == null) return true
  const t = value.trim()
  return t === '' || t === '—' || t === 'n/a' || t === 'N/A' || t === '0'
}

export function countDataHubSources(rows: DataHubRow[]): number {
  const set = new Set<string>()
  for (const r of rows) {
    if (isDataHubValueEmpty(r.value)) continue
    set.add(r.source)
  }
  return set.size
}
