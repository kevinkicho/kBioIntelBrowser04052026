/**
 * Browser profile aggregate cache — L1 memory + L2 IndexedDB (Phase A/B).
 *
 * Search history only stores hrefs. This layer restores category/pipeline/
 * similar/vendors payloads on reopen (SPA) and after hard reload (IDB).
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
const IDB_PUT_DEBOUNCE_MS = 120
const BC_NAME = 'biointel-profile-revisit-v1'

export type ProfileCacheKind = 'category' | 'pipeline' | 'similar' | 'vendors'

interface Entry {
  data: unknown
  expiresAt: number
}

const store = new Map<string, Entry>()
const pendingIdbPuts = new Map<string, { data: unknown; idbTtl: number; timer: ReturnType<typeof setTimeout> }>()
/** In-flight hydrate promises so tier-1 can await without double work. */
const hydrateInflight = new Map<number, Promise<number>>()

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
  kind: ProfileCacheKind,
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
  store.delete(key)
  store.set(key, e)
  return e.data as T
}

export type SetProfileCacheOpts = {
  skipIdb?: boolean
  idbTtlMs?: number
  /** Skip BroadcastChannel notify (when applying remote invalidation). */
  silent?: boolean
}

function scheduleIdbPut(key: string, data: unknown, idbTtl: number): void {
  const existing = pendingIdbPuts.get(key)
  if (existing) clearTimeout(existing.timer)
  const timer = setTimeout(() => {
    pendingIdbPuts.delete(key)
    void idbPutAggregate(key, data, idbTtl)
  }, IDB_PUT_DEBOUNCE_MS)
  pendingIdbPuts.set(key, { data, idbTtl, timer })
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
    scheduleIdbPut(key, data, opts?.idbTtlMs ?? PROFILE_REVISIT_TTL_MS)
  }
}

export function deleteProfileClientCache(key: string): void {
  store.delete(key)
  const pending = pendingIdbPuts.get(key)
  if (pending) {
    clearTimeout(pending.timer)
    pendingIdbPuts.delete(key)
  }
  void idbDeleteKey(key)
}

function memoryKeysForCid(cid: number): string[] {
  const prefixes = [
    `category:${cid}:`,
    `pipeline:${cid}:`,
    `similar:${cid}:`,
    `vendors:${cid}:`,
  ]
  return Array.from(store.keys()).filter((k) => prefixes.some((p) => k.startsWith(p)))
}

function clearMemoryForCid(cid: number): void {
  for (const k of memoryKeysForCid(cid)) {
    store.delete(k)
    const pending = pendingIdbPuts.get(k)
    if (pending) {
      clearTimeout(pending.timer)
      pendingIdbPuts.delete(k)
    }
  }
}

function getBroadcast(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  try {
    return new BroadcastChannel(BC_NAME)
  } catch {
    return null
  }
}

function notifyInvalidate(cid?: number): void {
  const bc = getBroadcast()
  if (!bc) return
  try {
    bc.postMessage({ type: 'invalidate', cid: cid ?? null })
  } catch {
    /* ignore */
  } finally {
    try {
      bc.close()
    } catch {
      /* ignore */
    }
  }
}

/** Listen for cross-tab invalidations (L1 only — IDB already shared). */
export function subscribeProfileCacheCrossTab(
  onInvalidate: (cid: number | null) => void,
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  let bc: BroadcastChannel
  try {
    bc = new BroadcastChannel(BC_NAME)
  } catch {
    return () => {}
  }
  const handler = (ev: MessageEvent) => {
    const data = ev.data as { type?: string; cid?: number | null }
    if (data?.type !== 'invalidate') return
    const cid = data.cid == null ? null : Number(data.cid)
    if (cid == null || !Number.isFinite(cid)) {
      store.clear()
      onInvalidate(null)
      return
    }
    clearMemoryForCid(cid)
    onInvalidate(cid)
  }
  bc.addEventListener('message', handler)
  return () => {
    bc.removeEventListener('message', handler)
    try {
      bc.close()
    } catch {
      /* ignore */
    }
  }
}

export function invalidateProfileClientCache(cid?: number, opts?: { silent?: boolean }): void {
  if (cid == null) {
    store.clear()
    pendingIdbPuts.forEach((p) => clearTimeout(p.timer))
    pendingIdbPuts.clear()
    void idbClearAll()
    if (!opts?.silent) notifyInvalidate(undefined)
    return
  }
  clearMemoryForCid(cid)
  void idbInvalidateCid(cid)
  if (!opts?.silent) notifyInvalidate(cid)
}

export async function clearAllProfileRevisitCache(): Promise<void> {
  store.clear()
  pendingIdbPuts.forEach((p) => clearTimeout(p.timer))
  pendingIdbPuts.clear()
  await idbClearAll()
  notifyInvalidate(undefined)
}

export function profileClientCacheSize(): number {
  return store.size
}

export async function getProfileClientCacheAsync<T>(key: string): Promise<T | undefined> {
  const mem = getProfileClientCache<T>(key)
  if (mem !== undefined) return mem
  const fromIdb = await idbGetAggregate(key)
  if (fromIdb === undefined) return undefined
  setProfileClientCache(key, fromIdb, DEFAULT_TTL_MS, { skipIdb: true })
  return fromIdb as T
}

/**
 * Promote all IDB aggregates for a CID into L1. Dedupes concurrent hydrates.
 */
export async function hydrateProfileRevisitFromIdb(cid: number): Promise<number> {
  const existing = hydrateInflight.get(cid)
  if (existing) return existing

  const promise = (async () => {
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
  })().finally(() => {
    hydrateInflight.delete(cid)
  })

  hydrateInflight.set(cid, promise)
  return promise
}

/** Wait for in-flight hydrate if any (no-op when none). */
export function awaitHydrateIfInflight(cid: number): Promise<number> {
  return hydrateInflight.get(cid) ?? Promise.resolve(0)
}
