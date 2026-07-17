/**
 * M1 / M3 / M7 funnel aggregators (v2.1 measurement contracts).
 * Pure functions over product event queues — no I/O.
 * @see docs/design/discovery-workbench-v2.1.md §5
 */

export interface FunnelEvent {
  name: string
  ts?: string
  props?: Record<string, string | number | boolean | null | undefined>
}

export interface M1FunnelSnapshot {
  startedCount: number
  rankedCount: number
  boardedCount: number
  packOrRhCount: number
  /** Temporal join: board after rank, then pack/RH after board (§5.1.1). */
  completedLoops: number
  boardRate: number
  packOrRhRate: number
  completionRate: number
  /** Median citable on pack_exported (null if no numeric props). */
  medianCitable: number | null
  /** Mean claim count on pack_exported */
  meanClaimCount: number | null
  /** M7 P50/P95 from discover_rank_completed.ms only (ms). */
  m7: { p50: number | null; p95: number | null; samples: number }
  /** Board status histogram from board_status_changed (M2). */
  boardStatusHistogram: Record<string, number>
}

const PACK_OR_RH = new Set([
  'pack_opened',
  'pack_exported',
  'research_hypothesis_opened',
])

/** Dual-read pack claim count props (§5.2). */
export function claimCountFromProps(
  p?: Record<string, unknown> | FunnelEvent['props'],
): number | null {
  if (!p) return null
  const v = p.claimCount ?? p.count
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Dual-read citable props (§5.2). */
export function citableFromProps(
  p?: Record<string, unknown> | FunnelEvent['props'],
): number | null {
  if (!p) return null
  const v = p.citableCount ?? p.citable
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function parseTs(ts?: string): number {
  if (!ts) return 0
  const n = Date.parse(ts)
  return Number.isFinite(n) ? n : 0
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function percentile(nums: number[], p: number): number | null {
  if (nums.length === 0) return null
  const s = [...nums].sort((a, b) => a - b)
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))
  return s[idx]
}

/**
 * Compute M1 funnel with temporal join + M3/M7 aggregates.
 * @param windowDays rolling window (default 7); 0 = all events
 */
export function computeM1FunnelFromEvents(
  events: readonly FunnelEvent[],
  opts?: { windowDays?: number; nowMs?: number },
): M1FunnelSnapshot {
  const windowDays = opts?.windowDays ?? 7
  const nowMs = opts?.nowMs ?? Date.now()
  const cutoff =
    windowDays > 0 ? nowMs - windowDays * 86400000 : 0

  const filtered = events
    .filter((e) => {
      if (!e.name) return false
      if (windowDays <= 0) return true
      const t = parseTs(e.ts)
      return t === 0 || t >= cutoff
    })
    .slice()
    .sort((a, b) => parseTs(a.ts) - parseTs(b.ts))

  let startedCount = 0
  let rankedCount = 0
  let boardedCount = 0
  let packOrRhCount = 0
  const rankTimes: number[] = []
  const boardEvents: { t: number; sessionId?: string }[] = []
  const packRhEvents: { t: number; sessionId?: string }[] = []
  const citableSamples: number[] = []
  const claimSamples: number[] = []
  const m7Samples: number[] = []
  const boardStatusHistogram: Record<string, number> = {}

  for (const e of filtered) {
    const t = parseTs(e.ts)
    const sessionId =
      typeof e.props?.sessionId === 'string' ? e.props.sessionId : undefined

    switch (e.name) {
      case 'discover_started':
        startedCount += 1
        break
      case 'discover_rank_completed':
        rankedCount += 1
        rankTimes.push(t)
        {
          const ms = e.props?.ms
          if (typeof ms === 'number' && Number.isFinite(ms) && ms >= 0) {
            m7Samples.push(ms)
          }
        }
        break
      case 'board_candidate_added':
        boardedCount += 1
        boardEvents.push({ t, sessionId })
        break
      case 'pack_opened':
      case 'pack_exported':
      case 'research_hypothesis_opened':
        if (PACK_OR_RH.has(e.name)) {
          packOrRhCount += 1
          packRhEvents.push({ t, sessionId })
        }
        if (e.name === 'pack_exported') {
          const c = citableFromProps(e.props)
          const n = claimCountFromProps(e.props)
          if (c != null) citableSamples.push(c)
          if (n != null) claimSamples.push(n)
        }
        break
      case 'board_status_changed': {
        const st = e.props?.status
        if (typeof st === 'string' && st) {
          boardStatusHistogram[st] = (boardStatusHistogram[st] ?? 0) + 1
        }
        break
      }
      default:
        break
    }
  }

  // completedLoops: each board after some rank, with pack/RH after board
  let completedLoops = 0
  for (const b of boardEvents) {
    const hasPriorRank = rankTimes.some((rt) => rt <= b.t || rt === 0)
    if (!hasPriorRank && rankTimes.length === 0) continue
    if (!hasPriorRank) continue
    const completes = packRhEvents.some((p) => {
      if (b.sessionId && p.sessionId && b.sessionId !== p.sessionId) return false
      return p.t >= b.t || p.t === 0
    })
    if (completes) completedLoops += 1
  }

  const boardRate = boardedCount / Math.max(startedCount, 1)
  const packOrRhRate = packOrRhCount / Math.max(boardedCount, 1)
  const completionRate = completedLoops / Math.max(boardedCount, 1)

  return {
    startedCount,
    rankedCount,
    boardedCount,
    packOrRhCount,
    completedLoops,
    boardRate,
    packOrRhRate,
    completionRate,
    medianCitable: median(citableSamples),
    meanClaimCount:
      claimSamples.length === 0
        ? null
        : claimSamples.reduce((a, b) => a + b, 0) / claimSamples.length,
    m7: {
      p50: percentile(m7Samples, 50),
      p95: percentile(m7Samples, 95),
      samples: m7Samples.length,
    },
    boardStatusHistogram,
  }
}

/** JSON export of funnel snapshot + raw counts. */
export function funnelSnapshotToJson(snap: M1FunnelSnapshot): string {
  return JSON.stringify(
    {
      schema: 'biointel-m1-funnel-v1',
      exportedAt: new Date().toISOString(),
      ...snap,
    },
    null,
    2,
  )
}

/** CSV one-liner metrics for spreadsheet paste. */
export function funnelSnapshotToCsv(snap: M1FunnelSnapshot): string {
  const headers = [
    'started',
    'ranked',
    'boarded',
    'packOrRh',
    'completedLoops',
    'boardRate',
    'packOrRhRate',
    'completionRate',
    'medianCitable',
    'meanClaimCount',
    'm7_p50_ms',
    'm7_p95_ms',
    'm7_samples',
  ]
  const row = [
    snap.startedCount,
    snap.rankedCount,
    snap.boardedCount,
    snap.packOrRhCount,
    snap.completedLoops,
    snap.boardRate.toFixed(4),
    snap.packOrRhRate.toFixed(4),
    snap.completionRate.toFixed(4),
    snap.medianCitable ?? '',
    snap.meanClaimCount != null ? snap.meanClaimCount.toFixed(2) : '',
    snap.m7.p50 ?? '',
    snap.m7.p95 ?? '',
    snap.m7.samples,
  ]
  return `${headers.join(',')}\n${row.join(',')}\n`
}
