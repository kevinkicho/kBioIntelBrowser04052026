/**
 * IndexedDB L2 for profile category/pipeline aggregates (Phase B).
 * Complements in-memory L1 (`profileClientCache`). Never localStorage.
 * @see docs/design/profile-revisit-cache.md §4
 */

export const PROFILE_REVISIT_IDB_NAME = 'biointel-profile-revisit'
export const PROFILE_REVISIT_IDB_STORE = 'aggregates'
export const PROFILE_REVISIT_IDB_VERSION = 1
/** Distinct CIDs retained (design §4.2). */
export const PROFILE_REVISIT_CID_LRU_MAX = 8
export const PROFILE_REVISIT_TTL_MS = 24 * 3600_000
export const PROFILE_REVISIT_MAX_RECORD_BYTES = 2_500_000

export type ProfileRevisitKind = 'category' | 'pipeline' | 'similar' | 'vendors'

export interface ProfileRevisitRecord {
  key: string
  cid: number
  kind: ProfileRevisitKind
  categoryId?: string
  data: unknown
  savedAt: string
  accessedAt: string
  expiresAt: number
  bytes: number
}

function canUseIdb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIdb()) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(PROFILE_REVISIT_IDB_NAME, PROFILE_REVISIT_IDB_VERSION)
      req.onerror = () => resolve(null)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(PROFILE_REVISIT_IDB_STORE)) {
          const store = db.createObjectStore(PROFILE_REVISIT_IDB_STORE, { keyPath: 'key' })
          store.createIndex('cid', 'cid', { unique: false })
          store.createIndex('accessedAt', 'accessedAt', { unique: false })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
        }
      }
      req.onsuccess = () => resolve(req.result)
    } catch {
      resolve(null)
    }
  })
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'))
  })
}

function waitTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('IDB aborted'))
  })
}

const VALID_KINDS = new Set<ProfileRevisitKind>([
  'category',
  'pipeline',
  'similar',
  'vendors',
])

export function parseProfileCacheKey(key: string): {
  kind: ProfileRevisitKind | null
  cid: number
  categoryId?: string
} {
  const first = key.indexOf(':')
  if (first < 0) return { kind: null, cid: 0 }
  const kindRaw = key.slice(0, first)
  const rest = key.slice(first + 1)
  const second = rest.indexOf(':')
  if (second < 0) return { kind: null, cid: 0 }
  const cid = parseInt(rest.slice(0, second), 10)
  const extra = rest.slice(second + 1)
  if (!VALID_KINDS.has(kindRaw as ProfileRevisitKind)) return { kind: null, cid: 0 }
  if (!Number.isFinite(cid) || cid < 1) return { kind: null, cid: 0 }
  const kind = kindRaw as ProfileRevisitKind
  const categoryId =
    kind === 'category' && extra
      ? extra.split('|')[0] || undefined
      : undefined
  return { kind, cid, categoryId }
}

function approxBytes(data: unknown): number {
  try {
    return JSON.stringify(data).length
  } catch {
    return PROFILE_REVISIT_MAX_RECORD_BYTES + 1
  }
}

async function deleteExpired(store: IDBObjectStore): Promise<void> {
  const now = Date.now()
  const all = (await idbReq(store.getAll())) as ProfileRevisitRecord[]
  for (const rec of all) {
    if (!rec || rec.expiresAt < now) {
      if (rec?.key) await idbReq(store.delete(rec.key))
    }
  }
}

/**
 * Evict whole CIDs when distinct cid count exceeds LRU max.
 * Oldest = minimum max(accessedAt) among records for that cid.
 */
export function selectCidsToEvict(
  records: readonly { cid: number; accessedAt: string }[],
  maxCids: number = PROFILE_REVISIT_CID_LRU_MAX,
): number[] {
  const latest = new Map<number, string>()
  for (const r of records) {
    const prev = latest.get(r.cid)
    if (!prev || r.accessedAt > prev) latest.set(r.cid, r.accessedAt)
  }
  if (latest.size <= maxCids) return []
  const ranked = Array.from(latest.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  const drop = ranked.slice(0, ranked.length - maxCids)
  return drop.map(([cid]) => cid)
}

async function evictIfNeeded(store: IDBObjectStore): Promise<void> {
  const all = (await idbReq(store.getAll())) as ProfileRevisitRecord[]
  const toDrop = selectCidsToEvict(all, PROFILE_REVISIT_CID_LRU_MAX)
  if (toDrop.length === 0) return
  const dropSet = new Set(toDrop)
  for (const rec of all) {
    if (dropSet.has(rec.cid)) await idbReq(store.delete(rec.key))
  }
}

export async function idbGetAggregate(key: string): Promise<unknown | undefined> {
  if (!key) return undefined
  const db = await openDb()
  if (!db) return undefined
  try {
    const tx = db.transaction(PROFILE_REVISIT_IDB_STORE, 'readwrite')
    const store = tx.objectStore(PROFILE_REVISIT_IDB_STORE)
    const rec = (await idbReq(store.get(key))) as ProfileRevisitRecord | undefined
    if (!rec || rec.expiresAt < Date.now()) {
      if (rec?.key) await idbReq(store.delete(rec.key))
      await waitTx(tx)
      return undefined
    }
    rec.accessedAt = new Date().toISOString()
    await idbReq(store.put(rec))
    await waitTx(tx)
    return rec.data
  } catch {
    return undefined
  } finally {
    db.close()
  }
}

export async function idbPutAggregate(
  key: string,
  data: unknown,
  ttlMs: number = PROFILE_REVISIT_TTL_MS,
): Promise<boolean> {
  const parsed = parseProfileCacheKey(key)
  if (!parsed.kind || !parsed.cid) return false
  const bytes = approxBytes(data)
  if (bytes > PROFILE_REVISIT_MAX_RECORD_BYTES) return false

  const now = Date.now()
  const rec: ProfileRevisitRecord = {
    key,
    cid: parsed.cid,
    kind: parsed.kind,
    categoryId: parsed.categoryId,
    data,
    savedAt: new Date(now).toISOString(),
    accessedAt: new Date(now).toISOString(),
    expiresAt: now + ttlMs,
    bytes,
  }

  const tryWrite = async (): Promise<boolean> => {
    const db = await openDb()
    if (!db) return false
    try {
      const tx = db.transaction(PROFILE_REVISIT_IDB_STORE, 'readwrite')
      const store = tx.objectStore(PROFILE_REVISIT_IDB_STORE)
      await deleteExpired(store)
      await idbReq(store.put(rec))
      await evictIfNeeded(store)
      await waitTx(tx)
      return true
    } catch {
      return false
    } finally {
      db.close()
    }
  }

  let ok = await tryWrite()
  if (ok) return true

  // Quota pressure: drop two oldest CIDs and retry once
  const db = await openDb()
  if (!db) return false
  try {
    const tx = db.transaction(PROFILE_REVISIT_IDB_STORE, 'readwrite')
    const store = tx.objectStore(PROFILE_REVISIT_IDB_STORE)
    const all = (await idbReq(store.getAll())) as ProfileRevisitRecord[]
    const drop = selectCidsToEvict(all, Math.max(0, PROFILE_REVISIT_CID_LRU_MAX - 2))
    const dropSet = new Set(drop)
    for (const r of all) {
      if (dropSet.has(r.cid)) await idbReq(store.delete(r.key))
    }
    await waitTx(tx)
  } catch {
    /* ignore */
  } finally {
    db.close()
  }
  ok = await tryWrite()
  return ok
}

export async function idbInvalidateCid(cid: number): Promise<void> {
  if (!cid || cid < 1) return
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(PROFILE_REVISIT_IDB_STORE, 'readwrite')
    const store = tx.objectStore(PROFILE_REVISIT_IDB_STORE)
    const idx = store.index('cid')
    const rows = (await idbReq(idx.getAll(cid))) as ProfileRevisitRecord[]
    for (const r of rows) {
      if (r?.key) await idbReq(store.delete(r.key))
    }
    await waitTx(tx)
  } catch {
    /* ignore */
  } finally {
    db.close()
  }
}

export async function idbDeleteKey(key: string): Promise<void> {
  if (!key) return
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(PROFILE_REVISIT_IDB_STORE, 'readwrite')
    await idbReq(tx.objectStore(PROFILE_REVISIT_IDB_STORE).delete(key))
    await waitTx(tx)
  } catch {
    /* ignore */
  } finally {
    db.close()
  }
}

export async function idbClearAll(): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(PROFILE_REVISIT_IDB_STORE, 'readwrite')
    await idbReq(tx.objectStore(PROFILE_REVISIT_IDB_STORE).clear())
    await waitTx(tx)
  } catch {
    /* ignore */
  } finally {
    db.close()
  }
}

/**
 * Load all non-expired aggregates for a CID into a list (caller promotes to L1).
 */
export async function idbListForCid(cid: number): Promise<ProfileRevisitRecord[]> {
  if (!cid || cid < 1) return []
  const db = await openDb()
  if (!db) return []
  try {
    const tx = db.transaction(PROFILE_REVISIT_IDB_STORE, 'readwrite')
    const store = tx.objectStore(PROFILE_REVISIT_IDB_STORE)
    const idx = store.index('cid')
    const rows = (await idbReq(idx.getAll(cid))) as ProfileRevisitRecord[]
    const now = Date.now()
    const live: ProfileRevisitRecord[] = []
    for (const r of rows) {
      if (!r) continue
      if (r.expiresAt < now) {
        await idbReq(store.delete(r.key))
        continue
      }
      r.accessedAt = new Date().toISOString()
      await idbReq(store.put(r))
      live.push(r)
    }
    await waitTx(tx)
    return live
  } catch {
    return []
  } finally {
    db.close()
  }
}
