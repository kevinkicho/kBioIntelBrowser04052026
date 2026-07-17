/**
 * Local saved Discover sessions (v2.1 V21-05).
 * localStorage only — restore does not auto-rank.
 */

export const DISCOVER_SESSIONS_KEY = 'biointel-discover-sessions-v1'
export const MAX_DISCOVER_SESSIONS = 20

export interface DiscoverSessionSnapshot {
  id: string
  label: string
  savedAt: string
  q: string
  diseaseId: string | null
  targets: string[]
  /** Optional rare-disease pin provenance snapshot */
  orphanet?: {
    orphaCode: string | null
    diseaseName: string | null
    genes: string[]
  } | null
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readAll(): DiscoverSessionSnapshot[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(DISCOVER_SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is DiscoverSessionSnapshot =>
        !!x &&
        typeof x === 'object' &&
        typeof (x as DiscoverSessionSnapshot).id === 'string' &&
        typeof (x as DiscoverSessionSnapshot).savedAt === 'string',
    )
  } catch {
    return []
  }
}

function writeAll(sessions: DiscoverSessionSnapshot[]): void {
  if (!canUseStorage()) return
  try {
    localStorage.setItem(DISCOVER_SESSIONS_KEY, JSON.stringify(sessions))
  } catch {
    // quota — ignore
  }
}

export function listDiscoverSessions(): DiscoverSessionSnapshot[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export function saveDiscoverSession(
  input: Omit<DiscoverSessionSnapshot, 'id' | 'savedAt'> & { id?: string },
): DiscoverSessionSnapshot {
  const session: DiscoverSessionSnapshot = {
    id: input.id ?? `ds_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    label: (input.label || input.q || 'Untitled session').slice(0, 120),
    savedAt: new Date().toISOString(),
    q: input.q ?? '',
    diseaseId: input.diseaseId ?? null,
    targets: (input.targets ?? []).slice(0, 10),
    orphanet: input.orphanet ?? null,
  }
  const rest = readAll().filter((s) => s.id !== session.id)
  const next = [session, ...rest].slice(0, MAX_DISCOVER_SESSIONS)
  writeAll(next)
  return session
}

export function deleteDiscoverSession(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id))
}

export function getDiscoverSession(id: string): DiscoverSessionSnapshot | null {
  return readAll().find((s) => s.id === id) ?? null
}
