/**
 * IndexedDB cache for full EvidencePack payloads (never localStorage).
 * Global LRU 20 — RH claim rehydrate (V2 DoD closeout).
 * Graceful no-op when IDB unavailable.
 * @see docs/design/discovery-workbench-v2.md §6.6.1
 */

import type { EvidencePack } from '@/lib/evidence/pack'
import { isEvidencePack } from '@/lib/evidence/pack'

export const PACK_IDB_NAME = 'biointel-packs'
export const PACK_IDB_STORE = 'packs'
export const PACK_IDB_VERSION = 1
/** Global LRU cap (design §7.3). */
export const PACK_IDB_LRU_MAX = 20

interface PackCacheRecord {
  id: string
  pack: EvidencePack
  accessedAt: string
}

function canUseIdb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIdb()) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(PACK_IDB_NAME, PACK_IDB_VERSION)
      req.onerror = () => resolve(null)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(PACK_IDB_STORE)) {
          const store = db.createObjectStore(PACK_IDB_STORE, { keyPath: 'id' })
          store.createIndex('accessedAt', 'accessedAt', { unique: false })
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

/**
 * Store a full pack (download / share success). LRU evicts oldest by accessedAt.
 */
export async function putPackInCache(pack: EvidencePack): Promise<boolean> {
  if (!pack?.id || !isEvidencePack(pack)) return false
  const db = await openDb()
  if (!db) return false
  try {
    const tx = db.transaction(PACK_IDB_STORE, 'readwrite')
    const store = tx.objectStore(PACK_IDB_STORE)
    const rec: PackCacheRecord = {
      id: pack.id,
      pack,
      accessedAt: new Date().toISOString(),
    }
    await idbReq(store.put(rec))

    // LRU: if over cap, delete oldest
    const all = await idbReq(store.getAll()) as PackCacheRecord[]
    if (all.length > PACK_IDB_LRU_MAX) {
      const sorted = [...all].sort((a, b) => a.accessedAt.localeCompare(b.accessedAt))
      const toDrop = sorted.slice(0, all.length - PACK_IDB_LRU_MAX)
      for (const d of toDrop) {
        await idbReq(store.delete(d.id))
      }
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return true
  } catch {
    return false
  } finally {
    db.close()
  }
}

/** Load pack by id; bumps accessedAt on hit. */
export async function getPackFromCache(packId: string): Promise<EvidencePack | null> {
  if (!packId) return null
  const db = await openDb()
  if (!db) return null
  try {
    const tx = db.transaction(PACK_IDB_STORE, 'readwrite')
    const store = tx.objectStore(PACK_IDB_STORE)
    const rec = (await idbReq(store.get(packId))) as PackCacheRecord | undefined
    if (!rec?.pack || !isEvidencePack(rec.pack)) return null
    rec.accessedAt = new Date().toISOString()
    await idbReq(store.put(rec))
    return rec.pack
  } catch {
    return null
  } finally {
    db.close()
  }
}

export async function deletePackFromCache(packId: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(PACK_IDB_STORE, 'readwrite')
    await idbReq(tx.objectStore(PACK_IDB_STORE).delete(packId))
  } catch {
    /* ignore */
  } finally {
    db.close()
  }
}
