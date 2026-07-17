/**
 * Browser profile aggregate cache — L1 memory + L2 IndexedDB (Phase A/B).
 *
 * Search history only stores hrefs. This layer restores category/pipeline
 * payloads on reopen (SPA) and after hard reload (IDB).
 *
 * @see docs/design/profile-revisit-cache.md
 */

import {
  idbClearAll,
  idbDeleteKey,
  idbGetAggregate,
  idbInvalidateCid,
  idbListForCid,
  idbPutAggregate,
  PROFILE_REVISIT_TTL_MS,
} from './profileRevisitIdb'

const DEFAULT_TTL_MS = 45 * 60_000
const MAX_ENTRIES = 120

interface Entry {
  data: unknown
  expiresAt: number
}

const store = new Map<string, Entry>()

function touchEvict(): void {
  if (store.size <= MAX_ENTRIES) return
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

export type SetProfileCacheOpts = {
  /** When promoting from IDB, skip writing back to IDB. */
  skipIdb?: boolean
  /** IDB wall TTL (default 24h). Memory always uses ttlMs. */
  idbTtlMs?: number
}

export function setProfileClientCache(
  key: string,
  data: unknown,
  ttlMs: number = DEFAULT_TTL_MS,
  opts?: SetProfileCacheOpts,
): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
  touchEvict()
  if (!opts?.skipIdb) {
    const idbTtl = opts?.idbTtlMs ?? PROFILE_REVISIT_TTL_MS
    // Never block paint on IDB
    void idbPutAggregate(key, data, idbTtl)
  }
}

export function deleteProfileClientCache(key: string): void {
  store.delete(key)
  void idbDeleteKey(key)
}

export function invalidateProfileClientCache(cid?: number): void {
  if (cid == null) {
    store.clear()
    void idbClearAll()
    return
  }
  const prefixCat = `category:${cid}:`
  const prefixPipe = `pipeline:${cid}:`
  Array.from(store.keys()).forEach((k) => {
    if (k.startsWith(prefixCat) || k.startsWith(prefixPipe)) store.delete(k)
  })
  void idbInvalidateCid(cid)
}

/** Clear all profile revisit data (memory + IDB). Sidebar "Clear cache". */
export async function clearAllProfileRevisitCache(): Promise<void> {
  store.clear()
  await idbClearAll()
}

export function profileClientCacheSize(): number {
  return store.size
}

/**
 * L1 then L2. Promotes IDB hits into memory without re-writing IDB.
 */
export async function getProfileClientCacheAsync<T>(key: string): Promise<T | undefined> {
  const mem = getProfileClientCache<T>(key)
  if (mem !== undefined) return mem
  const fromIdb = await idbGetAggregate(key)
  if (fromIdb === undefined) return undefined
  setProfileClientCache(key, fromIdb, DEFAULT_TTL_MS, { skipIdb: true })
  return fromIdb as T
}

/**
 * Promote all IDB aggregates for a CID into L1. Returns count promoted.
 */
export async function hydrateProfileRevisitFromIdb(cid: number): Promise<number> {
  const rows = await idbListForCid(cid)
  let n = 0
  for (const r of rows) {
    if (!r?.key) continue
    const remaining = Math.max(0, r.expiresAt - Date.now())
    const memTtl = remaining > 0 ? Math.min(DEFAULT_TTL_MS, remaining) : DEFAULT_TTL_MS
    setProfileClientCache(r.key, r.data, memTtl, { skipIdb: true })
    n += 1
  }
  return n
}
