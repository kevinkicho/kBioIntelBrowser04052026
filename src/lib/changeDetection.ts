/**
 * Per-CID count snapshots + change detection (localStorage).
 * Used by molecule profile ChangeAlerts and project board signals (PR14).
 * @see docs/design/discovery-workbench-v1.md §5.6, KD13
 */

export interface ChangeItem {
  /** Data key in merged molecule category payload (e.g. clinicalTrials) */
  key: string
  /** Profile panel id for deep-link anchors (e.g. clinical-trials) */
  panelId: string
  category: string
  label: string
  type: 'new' | 'removed' | 'changed'
  count: number
}

const SNAPSHOT_PREFIX = 'biointel-snapshot-'

interface Snapshot {
  timestamp: string
  counts: Record<string, number>
}

/** Count keys tracked for change detection, with panel deep-link targets. */
export const TRACKED_KEYS: {
  key: string
  label: string
  category: string
  panelId: string
}[] = [
  { key: 'companies', label: 'approved products', category: 'Pharmaceutical', panelId: 'companies' },
  { key: 'ndcProducts', label: 'NDC codes', category: 'Pharmaceutical', panelId: 'ndc' },
  {
    key: 'healthCanadaProducts',
    label: 'Health Canada DPD',
    category: 'Pharmaceutical',
    panelId: 'health-canada',
  },
  { key: 'clinicalTrials', label: 'clinical trials', category: 'Clinical', panelId: 'clinical-trials' },
  { key: 'adverseEvents', label: 'adverse events', category: 'Safety', panelId: 'adverse-events' },
  { key: 'drugRecalls', label: 'recalls', category: 'Safety', panelId: 'recalls' },
  { key: 'patents', label: 'patents', category: 'Research', panelId: 'patents' },
  { key: 'literature', label: 'publications', category: 'Research', panelId: 'literature' },
  { key: 'nihGrants', label: 'NIH grants', category: 'Research', panelId: 'nih-reporter' },
  {
    key: 'openAireProjects',
    label: 'OpenAIRE projects',
    category: 'Research',
    panelId: 'openaire-projects',
  },
  { key: 'chemblActivities', label: 'bioactivities', category: 'Bioactivity', panelId: 'chembl' },
  { key: 'pdbStructures', label: '3D structures', category: 'Structural', panelId: 'pdb' },
]

/** Categories needed to populate TRACKED_KEYS counts. */
export const TRACKED_CATEGORY_IDS = [
  'pharmaceutical',
  'clinical-safety',
  'research-literature',
  'bioactivity-targets',
  'protein-structure',
] as const

export function getSnapshot(cid: number): Snapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_PREFIX}${cid}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Extract array-length counts for tracked keys from merged category data. */
export function extractTrackedCounts(data: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const { key } of TRACKED_KEYS) {
    const val = data[key]
    counts[key] = Array.isArray(val) ? val.length : 0
  }
  return counts
}

export function saveSnapshot(cid: number, data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const counts = extractTrackedCounts(data)
  const snapshot: Snapshot = {
    timestamp: new Date().toISOString(),
    counts,
  }
  try {
    localStorage.setItem(`${SNAPSHOT_PREFIX}${cid}`, JSON.stringify(snapshot))
  } catch {
    // localStorage full, ignore
  }
}

/**
 * Compare current data array lengths against the last saved snapshot.
 * Returns [] when no prior snapshot exists (first visit baseline).
 */
export function detectChanges(cid: number, currentData: Record<string, unknown>): ChangeItem[] {
  const prev = getSnapshot(cid)
  if (!prev) return []

  const changes: ChangeItem[] = []

  for (const { key, label, category, panelId } of TRACKED_KEYS) {
    const currentVal = currentData[key]
    const currentCount = Array.isArray(currentVal) ? currentVal.length : 0
    const prevCount = prev.counts[key] ?? 0

    if (currentCount > prevCount) {
      changes.push({
        key,
        panelId,
        category,
        label,
        type: 'new',
        count: currentCount - prevCount,
      })
    } else if (currentCount < prevCount) {
      changes.push({
        key,
        panelId,
        category,
        label,
        type: 'removed',
        count: prevCount - currentCount,
      })
    }
  }

  return changes
}

/**
 * Pure count-diff helper (no localStorage). Useful for tests and project board
 * when current counts are already materialised.
 */
export function diffCounts(
  previous: Record<string, number> | null | undefined,
  current: Record<string, number>,
): ChangeItem[] {
  if (!previous) return []
  const changes: ChangeItem[] = []
  for (const { key, label, category, panelId } of TRACKED_KEYS) {
    const currentCount = current[key] ?? 0
    const prevCount = previous[key] ?? 0
    if (currentCount > prevCount) {
      changes.push({
        key,
        panelId,
        category,
        label,
        type: 'new',
        count: currentCount - prevCount,
      })
    } else if (currentCount < prevCount) {
      changes.push({
        key,
        panelId,
        category,
        label,
        type: 'removed',
        count: prevCount - currentCount,
      })
    }
  }
  return changes
}

export function getSnapshotAge(cid: number): string | null {
  const snap = getSnapshot(cid)
  if (!snap) return null
  return formatSnapshotAge(snap.timestamp)
}

export function formatSnapshotAge(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
