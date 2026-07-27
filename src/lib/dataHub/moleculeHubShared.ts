/**
 * Shared helpers for molecule data-hub section builders.
 */

import type { DataHubDomain, DataHubRow, DataHubSection } from './types'

export interface MoleculeIdentityInput {
  cid: number
  name: string
  formula?: string | null
  molecularWeight?: number | null
  inchiKey?: string | null
  iupacName?: string | null
  cas?: string | null
  synonyms?: string[] | null
}

export interface MoleculeHubPart {
  rows: DataHubRow[]
  section: DataHubSection
}

export function asArr(
  data: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] {
  const v = data[key]
  if (!Array.isArray(v)) return []
  return v.filter(
    (x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object',
  )
}

export function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

export function phaseLabel(
  phase: string | number | null | undefined,
): string | null {
  if (phase == null || phase === '') return null
  const s = String(phase).trim()
  return s || null
}

export function fmtMw(mw: number | null | undefined): string | null {
  if (mw == null || !Number.isFinite(mw) || mw <= 0) return null
  return mw >= 100 ? mw.toFixed(2) : String(Math.round(mw * 100) / 100)
}

export function row(
  partial: Omit<DataHubRow, 'value'> & { value: string | null | undefined },
): DataHubRow {
  const value = partial.value?.trim() || '—'
  return { ...partial, value }
}

export function section(
  id: string,
  title: string,
  domain: DataHubDomain,
  rows: DataHubRow[],
): DataHubSection {
  return { id, title, domain, rowIds: rows.map((r) => r.id) }
}

export function part(
  id: string,
  title: string,
  domain: DataHubDomain,
  rows: DataHubRow[],
): MoleculeHubPart {
  return { rows, section: section(id, title, domain, rows) }
}
