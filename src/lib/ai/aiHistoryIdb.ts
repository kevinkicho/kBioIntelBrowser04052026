/**
 * Local IndexedDB store for AI generations (solo default when signed out).
 * Dual-write path: always IDB; Firestore when signed in (via aiHistoryStore).
 */

import type { AiDataKind, AiGeneratedEntry, AiGeneratedRecord } from '@/lib/firebase/aiDataSync'

export const AI_HISTORY_IDB_NAME = 'biointel-ai-history'
export const AI_HISTORY_IDB_STORE = 'generations'
export const AI_HISTORY_IDB_VERSION = 1
/** Cap local rows to avoid unbounded growth */
export const AI_HISTORY_IDB_MAX = 200

function canUseIdb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIdb()) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(AI_HISTORY_IDB_NAME, AI_HISTORY_IDB_VERSION)
      req.onerror = () => resolve(null)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(AI_HISTORY_IDB_STORE)) {
          const store = db.createObjectStore(AI_HISTORY_IDB_STORE, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('kind', 'kind', { unique: false })
          store.createIndex('mode', 'mode', { unique: false })
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

export async function putAiHistoryLocal(
  entry: AiGeneratedEntry & { id?: string },
): Promise<AiGeneratedRecord | null> {
  const db = await openDb()
  if (!db) return null
  const id = entry.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const record: AiGeneratedRecord = {
    ...entry,
    id,
    createdAt: new Date().toISOString(),
    cloudSchema: 0,
  }
  try {
    const tx = db.transaction(AI_HISTORY_IDB_STORE, 'readwrite')
    const store = tx.objectStore(AI_HISTORY_IDB_STORE)
    await idbReq(store.put(record))
    // Evict oldest beyond max
    const all = await idbReq(store.getAll()) as AiGeneratedRecord[]
    if (all.length > AI_HISTORY_IDB_MAX) {
      all.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      const drop = all.slice(0, all.length - AI_HISTORY_IDB_MAX)
      for (const d of drop) {
        await idbReq(store.delete(d.id))
      }
    }
    db.close()
    return record
  } catch {
    db.close()
    return null
  }
}

export async function listAiHistoryLocal(opts: {
  kind?: AiDataKind
  mode?: string
  pageSize?: number
  /** Exclusive end cursor: return items older than this */
  cursor?: { createdAt: string; id: string } | null
  contextKey?: string
}): Promise<{
  items: AiGeneratedRecord[]
  nextCursor: { createdAt: string; id: string } | null
  hasMore: boolean
}> {
  const db = await openDb()
  const pageSize = Math.min(25, Math.max(1, opts.pageSize ?? 8))
  if (!db) return { items: [], nextCursor: null, hasMore: false }
  try {
    const tx = db.transaction(AI_HISTORY_IDB_STORE, 'readonly')
    const store = tx.objectStore(AI_HISTORY_IDB_STORE)
    let all = (await idbReq(store.getAll())) as AiGeneratedRecord[]
    db.close()
    all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    if (opts.kind) all = all.filter((r) => r.kind === opts.kind)
    if (opts.mode) all = all.filter((r) => r.mode === opts.mode)
    if (opts.contextKey) {
      const k = opts.contextKey.toLowerCase()
      all = all.filter((r) => {
        const c = r.context
        if (!c) return false
        return (
          (c.name && c.name.toLowerCase().includes(k)) ||
          (c.packId && c.packId.includes(opts.contextKey!)) ||
          (c.projectId && c.projectId.includes(opts.contextKey!)) ||
          (c.hypId && c.hypId.includes(opts.contextKey!)) ||
          String(c.cid ?? '') === opts.contextKey
        )
      })
    }
    if (opts.cursor) {
      all = all.filter((r) => {
        if (r.createdAt < opts.cursor!.createdAt) return true
        if (r.createdAt === opts.cursor!.createdAt && r.id < opts.cursor!.id) return true
        return false
      })
    }
    const hasMore = all.length > pageSize
    const page = all.slice(0, pageSize)
    const last = page[page.length - 1]
    return {
      items: page,
      hasMore,
      nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
    }
  } catch {
    try {
      db.close()
    } catch {
      /* */
    }
    return { items: [], nextCursor: null, hasMore: false }
  }
}

export async function clearAiHistoryLocal(): Promise<number> {
  const db = await openDb()
  if (!db) return 0
  try {
    const tx = db.transaction(AI_HISTORY_IDB_STORE, 'readwrite')
    const store = tx.objectStore(AI_HISTORY_IDB_STORE)
    const all = (await idbReq(store.getAll())) as AiGeneratedRecord[]
    for (const r of all) await idbReq(store.delete(r.id))
    db.close()
    return all.length
  } catch {
    db.close()
    return 0
  }
}
