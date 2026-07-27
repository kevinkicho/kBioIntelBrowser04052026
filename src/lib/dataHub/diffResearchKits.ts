/**
 * Diff two research kit bundles (session A vs B) for of-record fact changes.
 */

import type { ResearchKitBundle } from './researchKit'
import { dataHubRowsForExport } from './exportDataHub'
import type { DataHubLedger, DataHubRow } from './types'
import { isDataHubValueEmpty } from './types'

export type KitDiffChangeKind = 'added' | 'removed' | 'changed' | 'unchanged'

export interface KitDiffRow {
  factId: string
  fact: string
  kind: KitDiffChangeKind
  before?: string
  after?: string
  source?: string
}

export interface KitDiffResult {
  subjectA: string
  subjectB: string
  added: KitDiffRow[]
  removed: KitDiffRow[]
  changed: KitDiffRow[]
  unchangedCount: number
  summary: string
}

function parseBundle(raw: unknown): ResearchKitBundle | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as ResearchKitBundle
  if (o.kind !== 'biointel-research-kit-bundle') return null
  if (!o.files || typeof o.files !== 'object') return null
  return o
}

/** Parse CSV data-hub field from a kit bundle into factId → value map (best-effort). */
export function parseHubCsvToMap(csv: string): Map<string, { fact: string; value: string; source: string }> {
  const map = new Map<string, { fact: string; value: string; source: string }>()
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return map
  // Expected: section,fact,value,source,...
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!)
    const fact = cols[1] || ''
    const value = cols[2] || '—'
    const source = cols[3] || ''
    if (!fact) continue
    const id = `${fact}::${source}`
    map.set(id, { fact, value, source })
  }
  return map
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        inQ = false
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQ = true
    } else if (c === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

export function rowsToMap(rows: DataHubRow[]): Map<string, DataHubRow> {
  const m = new Map<string, DataHubRow>()
  for (const r of rows) {
    if (isDataHubValueEmpty(r.value)) continue
    m.set(r.id, r)
  }
  return m
}

export function diffLedgers(
  a: DataHubLedger,
  b: DataHubLedger,
): KitDiffResult {
  const ma = rowsToMap(a.rows)
  const mb = rowsToMap(b.rows)
  const added: KitDiffRow[] = []
  const removed: KitDiffRow[] = []
  const changed: KitDiffRow[] = []
  let unchangedCount = 0
  const ids = new Set(Array.from(ma.keys()).concat(Array.from(mb.keys())))
  for (const id of Array.from(ids)) {
    const ra = ma.get(id)
    const rb = mb.get(id)
    if (ra && !rb) {
      removed.push({
        factId: id,
        fact: ra.fact,
        kind: 'removed',
        before: ra.value,
        source: ra.source,
      })
    } else if (!ra && rb) {
      added.push({
        factId: id,
        fact: rb.fact,
        kind: 'added',
        after: rb.value,
        source: rb.source,
      })
    } else if (ra && rb) {
      if (ra.value !== rb.value) {
        changed.push({
          factId: id,
          fact: ra.fact,
          kind: 'changed',
          before: ra.value,
          after: rb.value,
          source: rb.source || ra.source,
        })
      } else {
        unchangedCount++
      }
    }
  }
  const summary = `${added.length} added · ${removed.length} removed · ${changed.length} changed · ${unchangedCount} unchanged`
  return {
    subjectA: a.subjectLabel,
    subjectB: b.subjectLabel,
    added,
    removed,
    changed,
    unchangedCount,
    summary,
  }
}

export function diffResearchKitBundles(
  rawA: unknown,
  rawB: unknown,
): KitDiffResult | { error: string } {
  const a = typeof rawA === 'string' ? safeJson(rawA) : rawA
  const b = typeof rawB === 'string' ? safeJson(rawB) : rawB
  const ba = parseBundle(a)
  const bb = parseBundle(b)
  if (!ba) return { error: 'First file is not a biointel-research-kit-bundle' }
  if (!bb) return { error: 'Second file is not a biointel-research-kit-bundle' }

  const mapA = parseHubCsvToMap(ba.files['data-hub.csv'] || '')
  const mapB = parseHubCsvToMap(bb.files['data-hub.csv'] || '')
  const added: KitDiffRow[] = []
  const removed: KitDiffRow[] = []
  const changed: KitDiffRow[] = []
  let unchangedCount = 0
  const keys = new Set(Array.from(mapA.keys()).concat(Array.from(mapB.keys())))
  for (const k of Array.from(keys)) {
    const va = mapA.get(k)
    const vb = mapB.get(k)
    if (va && !vb) {
      removed.push({
        factId: k,
        fact: va.fact,
        kind: 'removed',
        before: va.value,
        source: va.source,
      })
    } else if (!va && vb) {
      added.push({
        factId: k,
        fact: vb.fact,
        kind: 'added',
        after: vb.value,
        source: vb.source,
      })
    } else if (va && vb) {
      if (va.value !== vb.value) {
        changed.push({
          factId: k,
          fact: va.fact,
          kind: 'changed',
          before: va.value,
          after: vb.value,
          source: vb.source,
        })
      } else unchangedCount++
    }
  }
  return {
    subjectA: ba.subjectLabel || ba.subjectId,
    subjectB: bb.subjectLabel || bb.subjectId,
    added,
    removed,
    changed,
    unchangedCount,
    summary: `${added.length} added · ${removed.length} removed · ${changed.length} changed · ${unchangedCount} unchanged`,
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

// silence unused import if tree-shaken differently
void dataHubRowsForExport
