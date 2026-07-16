/**
 * Project-aware signal detection — wraps changeDetection with deep links.
 * @see docs/design/discovery-workbench-v1.md §5.6 KD13
 */

import {
  detectChanges,
  diffCounts,
  extractTrackedCounts,
  formatSnapshotAge,
  getSnapshot,
  saveSnapshot,
  type ChangeItem,
} from '@/lib/changeDetection'
import { buildMoleculePanelDeepLink, type DeepLinkOptions } from './deepLink'

/** A count change with a navigable panel deep link (anti-cosmetic DoD). */
export interface SignalItem extends ChangeItem {
  href: string
}

export interface DetectSignalsOptions extends DeepLinkOptions {
  /** When true, write a new baseline snapshot after detection (default false). */
  saveSnapshotAfter?: boolean
}

/** Attach deep-link hrefs to change items. */
export function toSignalItems(
  changes: ChangeItem[],
  cid: number,
  opts?: DeepLinkOptions,
): SignalItem[] {
  return changes.map((c) => ({
    ...c,
    href: buildMoleculePanelDeepLink(cid, c.panelId, opts),
  }))
}

/**
 * Detect count diffs vs last snapshot for a CID and attach panel deep links.
 * Returns [] when no prior snapshot (first observation becomes baseline only if saveSnapshotAfter).
 */
export function detectMoleculeSignals(
  cid: number,
  currentData: Record<string, unknown>,
  opts?: DetectSignalsOptions,
): SignalItem[] {
  const changes = detectChanges(cid, currentData)
  const signals = toSignalItems(changes, cid, opts)
  if (opts?.saveSnapshotAfter) {
    saveSnapshot(cid, currentData)
  }
  return signals
}

/**
 * Pure signal detection from explicit previous/current count maps (testable, no DOM).
 */
export function detectSignalsFromCounts(
  cid: number,
  previous: Record<string, number> | null | undefined,
  current: Record<string, number>,
  opts?: DeepLinkOptions,
): SignalItem[] {
  return toSignalItems(diffCounts(previous ?? null, current), cid, opts)
}

export interface MoleculeSignalSummary {
  cid: number
  signals: SignalItem[]
  /** Human age of prior snapshot, or null if none */
  snapshotAge: string | null
  /** true when a prior snapshot existed (signals may still be empty) */
  hadSnapshot: boolean
}

/**
 * Summarise signals for one molecule from merged category data.
 * Does not auto-save; callers decide when to refresh the baseline.
 */
export function summariseMoleculeSignals(
  cid: number,
  currentData: Record<string, unknown>,
  opts?: DeepLinkOptions,
): MoleculeSignalSummary {
  const snap = getSnapshot(cid)
  const hadSnapshot = !!snap
  const signals = detectMoleculeSignals(cid, currentData, opts)
  return {
    cid,
    signals,
    snapshotAge: snap ? formatSnapshotAge(snap.timestamp) : null,
    hadSnapshot,
  }
}

export { extractTrackedCounts, saveSnapshot, getSnapshot, formatSnapshotAge }
