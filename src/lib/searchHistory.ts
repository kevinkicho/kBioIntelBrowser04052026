/**
 * Persistent search / query history (localStorage).
 * Lets users reopen prior work without re-running slow multi-source fetches.
 * Does not store full payload blobs here — those live in optional caches (discover rank).
 */

export const SEARCH_HISTORY_KEY = 'biointel-search-history-v1'
export const SEARCH_HISTORY_UI_KEY = 'biointel-search-history-ui-v1'
export const MAX_SEARCH_HISTORY = 80

export type SearchHistoryKind =
  | 'molecule'
  | 'disease'
  | 'gene'
  | 'discover'
  | 'project'
  | 'other'

export interface SearchHistoryEntry {
  id: string
  kind: SearchHistoryKind
  /** Primary search text */
  query: string
  /** Display title (often same as query or resolved name) */
  title: string
  /** App path to reopen (includes query string) */
  href: string
  createdAt: string
  lastVisitedAt: string
  visitCount: number
  meta?: {
    cid?: number
    diseaseId?: string | null
    targetCount?: number
    candidateCount?: number
    projectId?: string
  }
}

export type SearchHistorySort = 'recent' | 'oldest' | 'title' | 'visits' | 'kind'
export type SearchHistoryFilter = 'all' | SearchHistoryKind

export interface SearchHistoryUiState {
  collapsed: boolean
  sort: SearchHistorySort
  filter: SearchHistoryFilter
  query: string
}

export const DEFAULT_HISTORY_UI: SearchHistoryUiState = {
  collapsed: false,
  sort: 'recent',
  filter: 'all',
  query: '',
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function newId(): string {
  return `sh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeHref(href: string): string {
  try {
    // Strip refresh bust params for dedupe keys
    const u = new URL(href, 'http://local.invalid')
    u.searchParams.delete('refresh')
    u.searchParams.delete('_t')
    return `${u.pathname}${u.search}`
  } catch {
    return href.split('&refresh=')[0].split('?refresh=')[0]
  }
}

export function readSearchHistory(): SearchHistoryEntry[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is SearchHistoryEntry =>
        !!x &&
        typeof x === 'object' &&
        typeof (x as SearchHistoryEntry).id === 'string' &&
        typeof (x as SearchHistoryEntry).href === 'string' &&
        typeof (x as SearchHistoryEntry).kind === 'string',
    )
  } catch {
    return []
  }
}

function writeSearchHistory(entries: SearchHistoryEntry[]): void {
  if (!canUseStorage()) return
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_SEARCH_HISTORY)))
  } catch {
    // quota — drop oldest half
    try {
      const slim = entries.slice(0, Math.floor(MAX_SEARCH_HISTORY / 2))
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(slim))
    } catch {
      /* ignore */
    }
  }
}

export function readHistoryUi(): SearchHistoryUiState {
  if (!canUseStorage()) return { ...DEFAULT_HISTORY_UI }
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_UI_KEY)
    if (!raw) return { ...DEFAULT_HISTORY_UI }
    const o = JSON.parse(raw) as Partial<SearchHistoryUiState>
    return {
      collapsed: typeof o.collapsed === 'boolean' ? o.collapsed : DEFAULT_HISTORY_UI.collapsed,
      sort: (o.sort as SearchHistorySort) || DEFAULT_HISTORY_UI.sort,
      filter: (o.filter as SearchHistoryFilter) || DEFAULT_HISTORY_UI.filter,
      query: typeof o.query === 'string' ? o.query : '',
    }
  } catch {
    return { ...DEFAULT_HISTORY_UI }
  }
}

export function writeHistoryUi(patch: Partial<SearchHistoryUiState>): SearchHistoryUiState {
  const next = { ...readHistoryUi(), ...patch }
  if (canUseStorage()) {
    try {
      localStorage.setItem(SEARCH_HISTORY_UI_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  return next
}

export interface RecordSearchInput {
  kind: SearchHistoryKind
  query: string
  title?: string
  href: string
  meta?: SearchHistoryEntry['meta']
}

/**
 * Upsert by normalized href. Bumps visitCount + lastVisitedAt.
 * Emits `biointel-search-history` CustomEvent for live sidebar updates.
 */
export function recordSearch(input: RecordSearchInput): SearchHistoryEntry | null {
  if (!canUseStorage()) return null
  const href = normalizeHref(input.href)
  if (!href || href === '/') return null
  const query = (input.query || input.title || href).trim()
  if (!query) return null
  const title = (input.title || query).trim().slice(0, 200)
  const now = new Date().toISOString()

  const all = readSearchHistory()
  const idx = all.findIndex((e) => normalizeHref(e.href) === href)
  let entry: SearchHistoryEntry
  if (idx >= 0) {
    entry = {
      ...all[idx],
      title,
      query,
      kind: input.kind,
      lastVisitedAt: now,
      visitCount: (all[idx].visitCount || 1) + 1,
      meta: { ...all[idx].meta, ...input.meta },
    }
    all.splice(idx, 1)
    all.unshift(entry)
  } else {
    entry = {
      id: newId(),
      kind: input.kind,
      query: query.slice(0, 200),
      title,
      href,
      createdAt: now,
      lastVisitedAt: now,
      visitCount: 1,
      meta: input.meta,
    }
    all.unshift(entry)
  }
  writeSearchHistory(all)
  try {
    window.dispatchEvent(new CustomEvent('biointel-search-history', { detail: entry }))
  } catch {
    /* ignore */
  }
  return entry
}

export function removeSearchHistory(id: string): void {
  writeSearchHistory(readSearchHistory().filter((e) => e.id !== id))
  try {
    window.dispatchEvent(new CustomEvent('biointel-search-history', { detail: { removed: id } }))
  } catch {
    /* ignore */
  }
}

export function clearSearchHistory(): void {
  writeSearchHistory([])
  try {
    window.dispatchEvent(new CustomEvent('biointel-search-history', { detail: { cleared: true } }))
  } catch {
    /* ignore */
  }
}

export function sortAndFilterHistory(
  entries: SearchHistoryEntry[],
  opts: { sort?: SearchHistorySort; filter?: SearchHistoryFilter; query?: string },
): SearchHistoryEntry[] {
  const filter = opts.filter ?? 'all'
  const sort = opts.sort ?? 'recent'
  const q = (opts.query ?? '').trim().toLowerCase()

  let list = filter === 'all' ? [...entries] : entries.filter((e) => e.kind === filter)
  if (q) {
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.query.toLowerCase().includes(q) ||
        e.href.toLowerCase().includes(q),
    )
  }

  list.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return a.lastVisitedAt.localeCompare(b.lastVisitedAt)
      case 'title':
        return a.title.localeCompare(b.title)
      case 'visits':
        return (b.visitCount || 0) - (a.visitCount || 0)
      case 'kind':
        return a.kind.localeCompare(b.kind) || b.lastVisitedAt.localeCompare(a.lastVisitedAt)
      case 'recent':
      default:
        return b.lastVisitedAt.localeCompare(a.lastVisitedAt)
    }
  })
  return list
}

export function kindLabel(kind: SearchHistoryKind): string {
  switch (kind) {
    case 'molecule':
      return 'Molecule'
    case 'disease':
      return 'Disease'
    case 'gene':
      return 'Gene'
    case 'discover':
      return 'Discover'
    case 'project':
      return 'Project'
    default:
      return 'Other'
  }
}

/** Build href with cache-bust refresh params. */
export function hrefWithRefresh(href: string): string {
  try {
    const u = new URL(href, 'http://local.invalid')
    u.searchParams.set('refresh', '1')
    u.searchParams.set('_t', String(Date.now()))
    return `${u.pathname}${u.search}`
  } catch {
    const sep = href.includes('?') ? '&' : '?'
    return `${href}${sep}refresh=1&_t=${Date.now()}`
  }
}

// ── Optional Discover rank result cache (session-ish, size-capped) ───────────

export const DISCOVER_RANK_CACHE_KEY = 'biointel-discover-rank-cache-v1'
const MAX_RANK_CACHE = 8

export function discoverRankCacheKey(parts: {
  q?: string
  diseaseId?: string | null
  targets?: string[]
}): string {
  const t = (parts.targets ?? []).map((x) => x.toUpperCase()).sort().join(',')
  return `${(parts.q ?? '').trim().toLowerCase()}|${parts.diseaseId ?? ''}|${t}`
}

export interface DiscoverRankCacheEntry {
  data: unknown
  /** ISO timestamp when this rank was stored */
  at: string
}

/** Full cache entry (payload + stored-at) for honest “cached at …” UI. */
export function getCachedDiscoverRankEntry(key: string): DiscoverRankCacheEntry | null {
  if (!canUseStorage()) return null
  try {
    const raw = localStorage.getItem(DISCOVER_RANK_CACHE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, { at: string; data: unknown }>
    const e = map[key]
    if (!e || e.data == null) return null
    return { data: e.data, at: e.at || '' }
  } catch {
    return null
  }
}

/** Payload only (backward compatible). */
export function getCachedDiscoverRank(key: string): unknown | null {
  return getCachedDiscoverRankEntry(key)?.data ?? null
}

export function setCachedDiscoverRank(key: string, data: unknown): void {
  if (!canUseStorage()) return
  try {
    const raw = localStorage.getItem(DISCOVER_RANK_CACHE_KEY)
    const map: Record<string, { at: string; data: unknown }> = raw ? JSON.parse(raw) : {}
    map[key] = { at: new Date().toISOString(), data }
    // Evict oldest beyond cap
    const keys = Object.keys(map).sort(
      (a, b) => (map[b].at || '').localeCompare(map[a].at || ''),
    )
    while (keys.length > MAX_RANK_CACHE) {
      const drop = keys.pop()
      if (drop) delete map[drop]
    }
    localStorage.setItem(DISCOVER_RANK_CACHE_KEY, JSON.stringify(map))
  } catch {
    // oversized — clear cache
    try {
      localStorage.removeItem(DISCOVER_RANK_CACHE_KEY)
    } catch {
      /* ignore */
    }
  }
}

export function clearCachedDiscoverRank(key?: string): void {
  if (!canUseStorage()) return
  try {
    if (!key) {
      localStorage.removeItem(DISCOVER_RANK_CACHE_KEY)
      return
    }
    const raw = localStorage.getItem(DISCOVER_RANK_CACHE_KEY)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, unknown>
    delete map[key]
    localStorage.setItem(DISCOVER_RANK_CACHE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}
