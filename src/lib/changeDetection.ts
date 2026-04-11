export interface ChangeItem {
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

const TRACKED_KEYS: { key: string; label: string; category: string }[] = [
  { key: 'companies', label: 'approved products', category: 'Pharmaceutical' },
  { key: 'ndcProducts', label: 'NDC codes', category: 'Pharmaceutical' },
  { key: 'clinicalTrials', label: 'clinical trials', category: 'Clinical' },
  { key: 'adverseEvents', label: 'adverse events', category: 'Safety' },
  { key: 'drugRecalls', label: 'recalls', category: 'Safety' },
  { key: 'patents', label: 'patents', category: 'Research' },
  { key: 'literature', label: 'publications', category: 'Research' },
  { key: 'nihGrants', label: 'NIH grants', category: 'Research' },
  { key: 'chemblActivities', label: 'bioactivities', category: 'Bioactivity' },
  { key: 'pdbStructures', label: '3D structures', category: 'Structural' },
]

export function getSnapshot(cid: number): Snapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_PREFIX}${cid}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSnapshot(cid: number, data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const counts: Record<string, number> = {}
  for (const { key } of TRACKED_KEYS) {
    const val = data[key]
    counts[key] = Array.isArray(val) ? val.length : 0
  }
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

export function detectChanges(cid: number, currentData: Record<string, unknown>): ChangeItem[] {
  const prev = getSnapshot(cid)
  if (!prev) return []

  const changes: ChangeItem[] = []

  for (const { key, label, category } of TRACKED_KEYS) {
    const currentVal = currentData[key]
    const currentCount = Array.isArray(currentVal) ? currentVal.length : 0
    const prevCount = prev.counts[key] ?? 0

    if (currentCount > prevCount) {
      changes.push({
        category,
        label,
        type: 'new',
        count: currentCount - prevCount,
      })
    } else if (currentCount < prevCount) {
      changes.push({
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
  const seconds = Math.floor((Date.now() - new Date(snap.timestamp).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
