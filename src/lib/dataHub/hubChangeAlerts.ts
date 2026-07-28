/**
 * Solo-local hub fact change detection (session A vs session B).
 * Not multi-tenant cloud. Uses localStorage fingerprint of non-empty facts.
 */

import type { DataHubLedger } from './types'
import { isDataHubValueEmpty } from './types'

export const HUB_SNAPSHOT_KEY = 'biointel-hub-snapshots-v1'
export const HUB_SNAPSHOT_EVENT = 'biointel-hub-snapshots'
export const MAX_HUB_SNAPSHOTS = 40

export interface HubFactFingerprint {
  id: string
  fact: string
  value: string
  source: string
}

export interface HubSnapshot {
  subjectId: string
  subjectLabel: string
  entityType: 'molecule' | 'gene' | 'disease' | 'org' | 'other'
  savedAt: string
  facts: HubFactFingerprint[]
}

export interface HubChangeDiff {
  subjectId: string
  subjectLabel: string
  previousAt: string
  currentAt: string
  added: HubFactFingerprint[]
  removed: HubFactFingerprint[]
  changed: Array<{ id: string; fact: string; before: string; after: string; source: string }>
  summary: string
}

function loadAll(): Record<string, HubSnapshot> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(HUB_SNAPSHOT_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

function saveAll(map: Record<string, HubSnapshot>): void {
  if (typeof window === 'undefined') return
  try {
    const keys = Object.keys(map)
    if (keys.length > MAX_HUB_SNAPSHOTS) {
      const sorted = keys
        .map((k) => map[k]!)
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
        .slice(0, MAX_HUB_SNAPSHOTS)
      const next: Record<string, HubSnapshot> = {}
      for (const s of sorted) next[s.subjectId] = s
      map = next
    }
    window.localStorage.setItem(HUB_SNAPSHOT_KEY, JSON.stringify(map))
    window.dispatchEvent(new CustomEvent(HUB_SNAPSHOT_EVENT, { detail: map }))
  } catch {
    /* quota */
  }
}

export function fingerprintLedger(ledger: DataHubLedger): HubFactFingerprint[] {
  return ledger.rows
    .filter((r) => !isDataHubValueEmpty(r.value))
    .map((r) => ({
      id: r.id,
      fact: r.fact,
      value: r.value,
      source: r.source,
    }))
}

export function saveHubSnapshot(
  ledger: DataHubLedger,
  entityType: HubSnapshot['entityType'] = 'molecule',
): HubSnapshot {
  const snap: HubSnapshot = {
    subjectId: ledger.subjectId,
    subjectLabel: ledger.subjectLabel,
    entityType,
    savedAt: new Date().toISOString(),
    facts: fingerprintLedger(ledger),
  }
  const all = loadAll()
  all[ledger.subjectId] = snap
  saveAll(all)
  return snap
}

export function getHubSnapshot(subjectId: string): HubSnapshot | null {
  return loadAll()[subjectId] ?? null
}

export function diffHubSnapshot(
  previous: HubSnapshot,
  ledger: DataHubLedger,
): HubChangeDiff {
  const current = fingerprintLedger(ledger)
  const prevMap = new Map(previous.facts.map((f) => [f.id, f]))
  const curMap = new Map(current.map((f) => [f.id, f]))
  const added: HubFactFingerprint[] = []
  const removed: HubFactFingerprint[] = []
  const changed: HubChangeDiff['changed'] = []

  for (const [id, f] of Array.from(curMap.entries())) {
    const p = prevMap.get(id)
    if (!p) added.push(f)
    else if (p.value !== f.value) {
      changed.push({
        id,
        fact: f.fact,
        before: p.value,
        after: f.value,
        source: f.source,
      })
    }
  }
  for (const [id, f] of Array.from(prevMap.entries())) {
    if (!curMap.has(id)) removed.push(f)
  }

  const summary = `${added.length} added · ${removed.length} removed · ${changed.length} changed`
  return {
    subjectId: ledger.subjectId,
    subjectLabel: ledger.subjectLabel,
    previousAt: previous.savedAt,
    currentAt: new Date().toISOString(),
    added,
    removed,
    changed,
    summary,
  }
}

/** Diff against last saved snapshot for this subject (if any). */
export function diffAgainstSavedHub(
  ledger: DataHubLedger,
): HubChangeDiff | null {
  const prev = getHubSnapshot(ledger.subjectId)
  if (!prev) return null
  return diffHubSnapshot(prev, ledger)
}
