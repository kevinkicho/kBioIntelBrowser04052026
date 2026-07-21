/**
 * Watchlist density snapshots + change detection (localStorage).
 * Solo local default — not multi-tenant monitoring.
 */

import type { WatchlistDensitySummary } from '@/lib/watchlistSummary'
import { emptyWatchlistDensity } from '@/lib/watchlistSummary'

const PREFIX = 'biointel-watchlist-density-v1-'

export type DensityMetricKey = keyof WatchlistDensitySummary

export interface DensityChangeItem {
  key: DensityMetricKey
  label: string
  type: 'up' | 'down'
  delta: number
  previous: number
  current: number
}

export interface WatchlistDensitySnapshot {
  timestamp: string
  summary: WatchlistDensitySummary
}

const LABELS: Record<DensityMetricKey, string> = {
  approvedProducts: 'companies',
  activeTrials: 'trials',
  adverseEvents: 'adverse events',
  patents: 'patents',
  publications: 'publications',
  blaCount: 'BLA rows',
  purpleBookCount: 'Purple Book',
  biosimilarCount: 'biosimilar rows',
  sponsorCount: 'sponsors',
  rorCount: 'ROR orgs',
  grantCount: 'NIH grants',
  healthCanadaCount: 'Health Canada',
  emaCount: 'EMA rows',
}

export function densitySnapshotKey(cid: number): string {
  return `${PREFIX}${cid}`
}

export function getWatchlistDensitySnapshot(cid: number): WatchlistDensitySnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(densitySnapshotKey(cid))
    if (!raw) return null
    const parsed = JSON.parse(raw) as WatchlistDensitySnapshot
    if (!parsed?.summary || !parsed.timestamp) return null
    return parsed
  } catch {
    return null
  }
}

export function saveWatchlistDensitySnapshot(
  cid: number,
  summary: WatchlistDensitySummary,
): void {
  if (typeof window === 'undefined') return
  const snap: WatchlistDensitySnapshot = {
    timestamp: new Date().toISOString(),
    summary: { ...summary },
  }
  try {
    localStorage.setItem(densitySnapshotKey(cid), JSON.stringify(snap))
  } catch {
    // quota
  }
}

/**
 * Pure: compare previous summary to current. Empty when no previous.
 */
export function diffWatchlistDensity(
  previous: WatchlistDensitySummary | null | undefined,
  current: WatchlistDensitySummary,
): DensityChangeItem[] {
  if (!previous) return []
  const changes: DensityChangeItem[] = []
  for (const key of Object.keys(LABELS) as DensityMetricKey[]) {
    const prev = previous[key] ?? 0
    const cur = current[key] ?? 0
    if (cur === prev) continue
    changes.push({
      key,
      label: LABELS[key],
      type: cur > prev ? 'up' : 'down',
      delta: Math.abs(cur - prev),
      previous: prev,
      current: cur,
    })
  }
  return changes.sort((a, b) => b.delta - a.delta)
}

/**
 * Load prior snapshot, compute changes, save new baseline.
 */
export function detectAndSaveWatchlistDensityChanges(
  cid: number,
  current: WatchlistDensitySummary,
): DensityChangeItem[] {
  const prev = getWatchlistDensitySnapshot(cid)
  const changes = diffWatchlistDensity(prev?.summary, current)
  saveWatchlistDensitySnapshot(cid, current)
  return changes
}

export function formatDensityChanges(changes: DensityChangeItem[]): string {
  if (changes.length === 0) return ''
  return changes
    .slice(0, 4)
    .map((c) => `${c.type === 'up' ? '↑' : '↓'}${c.delta} ${c.label}`)
    .join(' · ')
}

/** Test helper: empty summary shape. */
export { emptyWatchlistDensity }
