/**
 * Source directory: free public APIs that contributed (or could contribute)
 * facts for the current entity, joined from the Data Hub ledger.
 */

import { getPanelSource } from '@/lib/panelSources'
import type { DataHubLedger, DataHubRow } from './types'
import { isDataHubValueEmpty } from './types'

export type SourceDirectoryStatus = 'has-data' | 'empty' | 'identity-only'

export interface SourceDirectoryEntry {
  /** Stable key = source label or panelId */
  id: string
  source: string
  /** API display name from panelSources when known */
  api?: string
  docs?: string
  endpoint?: string
  status: SourceDirectoryStatus
  /** Filled fact count for this source */
  factCount: number
  /** Sample fact labels */
  sampleFacts: string[]
  panelIds: string[]
  categoryIds: string[]
}

export interface SourceDirectory {
  subjectId: string
  subjectLabel: string
  entries: SourceDirectoryEntry[]
  withData: number
  empty: number
  total: number
}

function entryKey(row: DataHubRow): string {
  return (row.source || row.panelId || 'unknown').trim() || 'unknown'
}

/**
 * Build a coverage directory from a data hub ledger.
 * One entry per distinct free-API source label that appears on any row.
 */
export function buildSourceDirectory(ledger: DataHubLedger): SourceDirectory {
  const byKey = new Map<
    string,
    {
      source: string
      panelIds: Set<string>
      categoryIds: Set<string>
      filled: DataHubRow[]
      empty: DataHubRow[]
    }
  >()

  for (const r of ledger.rows) {
    const key = entryKey(r)
    let bucket = byKey.get(key)
    if (!bucket) {
      bucket = {
        source: r.source,
        panelIds: new Set(),
        categoryIds: new Set(),
        filled: [],
        empty: [],
      }
      byKey.set(key, bucket)
    }
    if (r.panelId) bucket.panelIds.add(r.panelId)
    if (r.categoryId) bucket.categoryIds.add(r.categoryId)
    if (isDataHubValueEmpty(r.value)) bucket.empty.push(r)
    else bucket.filled.push(r)
  }

  const entries: SourceDirectoryEntry[] = []
  for (const [id, b] of Array.from(byKey.entries())) {
    const panelId = Array.from(b.panelIds)[0]
    const meta = panelId ? getPanelSource(panelId) : null
    const factCount = b.filled.length
    const status: SourceDirectoryStatus =
      factCount > 0
        ? b.filled.every((r) => r.domain === 'identity' && !r.panelId)
          ? 'identity-only'
          : 'has-data'
        : 'empty'

    entries.push({
      id,
      source: b.source,
      api: meta?.api,
      docs: meta?.docs,
      endpoint: meta?.endpoint,
      status: factCount === 0 ? 'empty' : status === 'identity-only' && factCount > 0 ? 'has-data' : status,
      factCount,
      sampleFacts: b.filled.slice(0, 4).map((r) => r.fact),
      panelIds: Array.from(b.panelIds),
      categoryIds: Array.from(b.categoryIds),
    })
  }

  entries.sort((a, b) => {
    if (b.factCount !== a.factCount) return b.factCount - a.factCount
    return a.source.localeCompare(b.source)
  })

  const withData = entries.filter((e) => e.factCount > 0).length
  const empty = entries.length - withData

  return {
    subjectId: ledger.subjectId,
    subjectLabel: ledger.subjectLabel,
    entries,
    withData,
    empty,
    total: entries.length,
  }
}
