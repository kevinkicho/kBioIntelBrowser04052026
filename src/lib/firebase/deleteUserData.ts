/**
 * Delete all cloud data owned by a signed-in user (privacy / account wipe).
 * Does not delete the Firebase Auth account itself — only app data.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  type CollectionReference,
} from 'firebase/firestore'
import { listAll, deleteObject, ref } from 'firebase/storage'
import { getFirebaseFirestore, getFirebaseStorage } from './client'
import { FIRESTORE_COLLECTIONS, userDocPath } from './paths'
import { clearAIConfig } from '@/lib/ai/config'
import { clearLocalOllamaApiKey } from '@/lib/ai/userApiKey'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type DeleteUserDataReport = {
  ok: boolean
  projects: number
  packs: number
  settings: number
  ai: number
  storageObjects: number
  userProfile: boolean
  errors: string[]
  message: string
}

async function deleteCollectionDocs(
  col: CollectionReference | null,
): Promise<{ count: number; errors: string[] }> {
  if (!col) return { count: 0, errors: [] }
  const errors: string[] = []
  let count = 0
  try {
    const snap = await getDocs(col)
    for (const d of snap.docs) {
      try {
        await deleteDoc(d.ref)
        count += 1
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }
  return { count, errors }
}

async function deleteStorageExports(uid: string): Promise<{ count: number; errors: string[] }> {
  const storage = getFirebaseStorage()
  if (!storage) return { count: 0, errors: [] }
  const errors: string[] = []
  let count = 0
  try {
    const root = ref(storage, `users/${uid}/exports`)
    const listed = await listAll(root)
    for (const item of listed.items) {
      try {
        await deleteObject(item)
        count += 1
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }
  } catch (err) {
    // Empty prefix / permission often surfaces as list error — record but continue
    const msg = err instanceof Error ? err.message : String(err)
    if (!/not found|object-not-found/i.test(msg)) {
      errors.push(msg)
    }
  }
  return { count, errors }
}

/**
 * Wipe all BioIntel cloud data for `uid` under users/{uid}/… and Storage exports.
 * Also clears local AI connection config (device-side).
 */
export async function deleteAllUserData(uid: string): Promise<DeleteUserDataReport> {
  const db = getFirebaseFirestore()
  const errors: string[] = []

  if (!db) {
    return {
      ok: false,
      projects: 0,
      packs: 0,
      settings: 0,
      ai: 0,
      storageObjects: 0,
      userProfile: false,
      errors: ['Firestore is not available'],
      message: 'Could not delete cloud data — Firebase not configured.',
    }
  }

  const base = FIRESTORE_COLLECTIONS.users
  const projects = await deleteCollectionDocs(
    collection(db, base, uid, FIRESTORE_COLLECTIONS.projects),
  )
  const packs = await deleteCollectionDocs(
    collection(db, base, uid, FIRESTORE_COLLECTIONS.packs),
  )
  const settings = await deleteCollectionDocs(
    collection(db, base, uid, FIRESTORE_COLLECTIONS.settings),
  )
  const ai = await deleteCollectionDocs(
    collection(db, base, uid, FIRESTORE_COLLECTIONS.ai),
  )
  errors.push(...projects.errors, ...packs.errors, ...settings.errors, ...ai.errors)

  let userProfile = false
  try {
    await deleteDoc(doc(db, userDocPath(uid)))
    userProfile = true
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }

  const storage = await deleteStorageExports(uid)
  errors.push(...storage.errors)

  try {
    clearAIConfig()
    clearLocalOllamaApiKey()
  } catch {
    /* ignore */
  }

  const ok = errors.length === 0
  const message = ok
    ? `Deleted cloud data: ${projects.count} projects, ${packs.count} packs, ${settings.count} settings, ${ai.count} AI entries, ${storage.count} storage file(s).`
    : `Partial delete: ${projects.count} projects, ${packs.count} packs, ${ai.count} AI, ${storage.count} storage. Errors: ${errors.slice(0, 3).join('; ')}`

  logAgentActivity(
    'firebase.user.delete_all_data',
    {
      uid,
      projects: projects.count,
      packs: packs.count,
      settings: settings.count,
      ai: ai.count,
      storage: storage.count,
      ok,
    },
    { source: 'firebase', level: ok ? 'info' : 'warn' },
  )

  return {
    ok,
    projects: projects.count,
    packs: packs.count,
    settings: settings.count,
    ai: ai.count,
    storageObjects: storage.count,
    userProfile,
    errors,
    message,
  }
}
