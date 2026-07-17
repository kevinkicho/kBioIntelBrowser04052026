/**
 * Browser-session in-memory cache for molecule profile aggregates.
 *
 * Search history only stores hrefs — not payloads. Without this, clicking a
 * history item remounts ProfilePageClient and re-hits every category API even
 * when the user just left that molecule. Server process cache still helps
 * latency, but the UI still shows a full "fetching" pass.
 *
 * Scope: same tab / SPA session (cleared on full reload). Refresh (?refresh=1
 * or sidebar refresh) bypasses reads and overwrites entries.
 */

const DEFAULT_TTL_MS = 45 * 60_000
const MAX_ENTRIES = 120

interface Entry {
  data: unknown
  expiresAt: number
}

const store = new Map<string, Entry>()

function touchEvict(): void {
  if (store.size <= MAX_ENTRIES) return
  // Drop expired first, then oldest insertion order
  const now = Date.now()
  store.forEach((v, k) => {
    if (now > v.expiresAt) store.delete(k)
  })
  while (store.size > MAX_ENTRIES) {
    const first = store.keys().next().value
    if (first === undefined) break
    store.delete(first)
  }
}

export function profileCacheKey(
  kind: 'category' | 'pipeline',
  cid: number,
  extra = '',
): string {
  return `${kind}:${cid}:${extra}`
}

export function getProfileClientCache<T>(key: string): T | undefined {
  const e = store.get(key)
  if (!e) return undefined
  if (Date.now() > e.expiresAt) {
    store.delete(key)
    return undefined
  }
  // Refresh LRU order
  store.delete(key)
  store.set(key, e)
  return e.data as T
}

export function setProfileClientCache(
  key: string,
  data: unknown,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
  touchEvict()
}

export function deleteProfileClientCache(key: string): void {
  store.delete(key)
}

export function invalidateProfileClientCache(cid?: number): void {
  if (cid == null) {
    store.clear()
    return
  }
  const prefixCat = `category:${cid}:`
  const prefixPipe = `pipeline:${cid}:`
  Array.from(store.keys()).forEach((k) => {
    if (k.startsWith(prefixCat) || k.startsWith(prefixPipe)) store.delete(k)
  })
}

export function profileClientCacheSize(): number {
  return store.size
}
