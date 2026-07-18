/**
 * Solo in-app funnel (localStorage) — M1-style loop visibility without cloud.
 * Reads product events queue if present; also accepts direct increments.
 */

import type { ProductEventName } from '@/lib/productEvents'

const STORAGE_KEY = 'biointel-local-funnel-v1'

export interface LocalFunnelSnapshot {
  discover_started: number
  discover_rank_completed: number
  board_candidate_added: number
  pack_exported: number
  pack_opened: number
  decision_mode_open: number
  source_deep_link_opened: number
  updatedAt: string
}

const EMPTY: LocalFunnelSnapshot = {
  discover_started: 0,
  discover_rank_completed: 0,
  board_candidate_added: 0,
  pack_exported: 0,
  pack_opened: 0,
  decision_mode_open: 0,
  source_deep_link_opened: 0,
  updatedAt: new Date(0).toISOString(),
}

const TRACKED: (keyof Omit<LocalFunnelSnapshot, 'updatedAt'>)[] = [
  'discover_started',
  'discover_rank_completed',
  'board_candidate_added',
  'pack_exported',
  'pack_opened',
  'decision_mode_open',
  'source_deep_link_opened',
]

function isTracked(name: string): name is keyof Omit<LocalFunnelSnapshot, 'updatedAt'> {
  return (TRACKED as string[]).includes(name)
}

export function loadLocalFunnel(): LocalFunnelSnapshot {
  if (typeof window === 'undefined') return { ...EMPTY }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY }
    const o = JSON.parse(raw) as Partial<LocalFunnelSnapshot>
    const next = { ...EMPTY }
    for (const k of TRACKED) {
      const n = o[k]
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) next[k] = Math.floor(n)
    }
    if (typeof o.updatedAt === 'string') next.updatedAt = o.updatedAt
    return next
  } catch {
    return { ...EMPTY }
  }
}

export function recordLocalFunnelEvent(name: ProductEventName | string): void {
  if (typeof window === 'undefined') return
  if (!isTracked(name)) return
  try {
    const cur = loadLocalFunnel()
    cur[name] = (cur[name] ?? 0) + 1
    cur.updatedAt = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cur))
  } catch {
    /* quota */
  }
}

export function resetLocalFunnel(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Completion rate: packs after boards (proxy for loop). */
export function localFunnelRates(s: LocalFunnelSnapshot): {
  rankRate: number
  boardRate: number
  packRate: number
} {
  const rankRate = s.discover_started > 0 ? s.discover_rank_completed / s.discover_started : 0
  const boardRate =
    s.discover_rank_completed > 0 ? s.board_candidate_added / s.discover_rank_completed : 0
  const packRate =
    s.board_candidate_added > 0 ? s.pack_exported / s.board_candidate_added : 0
  return { rankRate, boardRate, packRate }
}
