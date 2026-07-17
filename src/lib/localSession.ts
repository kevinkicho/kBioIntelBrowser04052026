/**
 * Local workspace identity (solo product law — no multi-tenant auth).
 * Display name + session id live in localStorage for header chrome / logout.
 */

export const LOCAL_SESSION_KEY = 'biointel-local-session-v1'

export interface LocalSession {
  /** Stable-ish id for this browser workspace until logout */
  sessionId: string
  displayName: string
  createdAt: string
  lastActiveAt: string
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function newSessionId(): string {
  return `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function defaultName(): string {
  return 'Local researcher'
}

export function createLocalSession(displayName?: string): LocalSession {
  const now = new Date().toISOString()
  return {
    sessionId: newSessionId(),
    displayName: (displayName?.trim() || defaultName()).slice(0, 48),
    createdAt: now,
    lastActiveAt: now,
  }
}

export function readLocalSession(): LocalSession {
  if (!canUseStorage()) return createLocalSession()
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY)
    if (!raw) {
      const s = createLocalSession()
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(s))
      return s
    }
    const o = JSON.parse(raw) as Partial<LocalSession>
    if (!o.sessionId || !o.displayName) {
      const s = createLocalSession(o.displayName)
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(s))
      return s
    }
    return {
      sessionId: String(o.sessionId),
      displayName: String(o.displayName).slice(0, 48),
      createdAt: o.createdAt || new Date().toISOString(),
      lastActiveAt: o.lastActiveAt || o.createdAt || new Date().toISOString(),
    }
  } catch {
    return createLocalSession()
  }
}

export function writeLocalSession(patch: Partial<LocalSession>): LocalSession {
  const cur = readLocalSession()
  const next: LocalSession = {
    ...cur,
    ...patch,
    displayName: (patch.displayName ?? cur.displayName).trim().slice(0, 48) || defaultName(),
    lastActiveAt: new Date().toISOString(),
  }
  if (canUseStorage()) {
    try {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('biointel-local-session'))
  }
  return next
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'LR'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * End local session: new identity + clear browsing residue.
 * Does **not** delete projects, packs IDB, or discovery preferences
 * (those are durable workspace data — clear separately if needed).
 */
export async function endLocalSession(opts?: {
  clearSearchHistory?: boolean
  clearProfileCache?: boolean
  clearProductEvents?: boolean
  clearDiscoverRankCache?: boolean
}): Promise<LocalSession> {
  const {
    clearSearchHistory: doHist = true,
    clearProfileCache: doProf = true,
    clearProductEvents: doEv = true,
    clearDiscoverRankCache: doRank = true,
  } = opts ?? {}

  if (doProf) {
    const { clearAllProfileRevisitCache } = await import('./profileClientCache')
    await clearAllProfileRevisitCache()
  }
  if (doHist) {
    const { clearSearchHistory } = await import('./searchHistory')
    clearSearchHistory()
  }
  if (doEv) {
    const { clearQueuedProductEvents } = await import('./productEvents')
    clearQueuedProductEvents()
  }
  if (doRank) {
    const { clearCachedDiscoverRank } = await import('./searchHistory')
    clearCachedDiscoverRank()
  }

  const next = createLocalSession()
  if (canUseStorage()) {
    try {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('biointel-local-session'))
    window.dispatchEvent(new Event('biointel-search-history'))
  }
  return next
}

/**
 * Destructive factory reset: end session + clear projects, pack index, pack IDB.
 * Requires explicit user confirmation in UI (double confirm).
 */
export async function factoryResetLocalWorkspace(): Promise<LocalSession> {
  const next = await endLocalSession({
    clearSearchHistory: true,
    clearProfileCache: true,
    clearProductEvents: true,
    clearDiscoverRankCache: true,
  })

  try {
    const { listProjects, deleteProject } = await import('./project/store')
    for (const p of listProjects()) {
      deleteProject(p.id)
    }
  } catch {
    /* ignore */
  }

  try {
    const { clearPackIndex } = await import('./evidence/packIndex')
    clearPackIndex()
  } catch {
    /* ignore */
  }

  try {
    // Wipe pack IDB by deleting known DB
    if (typeof indexedDB !== 'undefined') {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('biointel-packs')
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => resolve()
      })
    }
  } catch {
    /* ignore */
  }

  try {
    const { resetDiscoveryPreferences } = await import('./discovery/preferences')
    resetDiscoveryPreferences()
  } catch {
    /* ignore */
  }

  try {
    const { clearCachedDiscoverRank, clearSearchHistory } = await import('./searchHistory')
    clearCachedDiscoverRank()
    clearSearchHistory()
  } catch {
    /* ignore */
  }

  return next
}
