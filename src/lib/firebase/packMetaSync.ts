/**
 * Pack *metadata* only ↔ Firestore users/{uid}/packs/{packId}.
 * Full claim payloads stay in download / IDB (product law).
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  isPackIndexEntry,
  listPackIndex,
  upsertPackIndexEntry,
  type PackIndexEntry,
} from '@/lib/evidence/packIndex'
import { getFirebaseFirestore } from './client'
import { FIRESTORE_COLLECTIONS } from './paths'
import { stripUndefined } from './sanitize'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type PackMetaSyncResult = {
  pushed: number
  pulled: number
  skipped: number
  errors: string[]
}

function packsCol(uid: string) {
  const db = getFirebaseFirestore()
  if (!db) return null
  return collection(db, FIRESTORE_COLLECTIONS.users, uid, FIRESTORE_COLLECTIONS.packs)
}

function packDoc(uid: string, packId: string) {
  const db = getFirebaseFirestore()
  if (!db) return null
  return doc(db, FIRESTORE_COLLECTIONS.users, uid, FIRESTORE_COLLECTIONS.packs, packId)
}

function toCloud(entry: PackIndexEntry): Record<string, unknown> {
  return stripUndefined({
    ...entry,
    cloudSchema: 1,
    cloudSyncedAt: new Date().toISOString(),
  }) as Record<string, unknown>
}

function fromCloud(data: Record<string, unknown>): PackIndexEntry | null {
  const rest: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('_') || k.startsWith('cloud')) continue
    rest[k] = v
  }
  return isPackIndexEntry(rest) ? rest : null
}

export async function pushPackIndexToCloud(uid: string): Promise<PackMetaSyncResult> {
  const result: PackMetaSyncResult = { pushed: 0, pulled: 0, skipped: 0, errors: [] }
  const local = listPackIndex()
  for (const entry of local) {
    const ref = packDoc(uid, entry.id)
    if (!ref) {
      result.errors.push('Firestore unavailable')
      break
    }
    try {
      await setDoc(
        ref,
        {
          ...toCloud(entry),
          _serverUpdatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      result.pushed += 1
    } catch (err) {
      result.errors.push(
        `Pack ${entry.id}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
  logAgentActivity('firebase.sync.push_pack_meta', { ...result, uid }, { source: 'firebase' })
  return result
}

export async function pullPackIndexFromCloud(uid: string): Promise<PackMetaSyncResult> {
  const result: PackMetaSyncResult = { pushed: 0, pulled: 0, skipped: 0, errors: [] }
  const col = packsCol(uid)
  if (!col) return result
  try {
    const snap = await getDocs(col)
    const localById = new Map(listPackIndex().map((e) => [e.id, e]))
    snap.forEach((d) => {
      const entry = fromCloud(d.data() as Record<string, unknown>)
      if (!entry) {
        result.skipped += 1
        return
      }
      const local = localById.get(entry.id)
      // Prefer newer createdAt (pack ids are content-stable; createdAt is write time)
      if (local && local.createdAt >= entry.createdAt) {
        result.skipped += 1
        return
      }
      const save = upsertPackIndexEntry(entry)
      if (save.ok) result.pulled += 1
      else {
        result.errors.push(save.message)
        result.skipped += 1
      }
    })
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err))
  }
  logAgentActivity('firebase.sync.pull_pack_meta', { ...result, uid }, { source: 'firebase' })
  return result
}

export async function syncPackMetadata(uid: string): Promise<PackMetaSyncResult> {
  const pulled = await pullPackIndexFromCloud(uid)
  const pushed = await pushPackIndexToCloud(uid)
  return {
    pushed: pushed.pushed,
    pulled: pulled.pulled,
    skipped: pushed.skipped + pulled.skipped,
    errors: [...pulled.errors, ...pushed.errors],
  }
}
