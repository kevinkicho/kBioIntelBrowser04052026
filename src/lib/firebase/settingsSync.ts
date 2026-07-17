/**
 * Discovery preferences ↔ Firestore users/{uid}/settings/discovery
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import {
  loadDiscoveryPreferences,
  parseDiscoveryPreferences,
  saveDiscoveryPreferences,
  type DiscoveryPreferences,
} from '@/lib/discovery/preferences'
import { getFirebaseFirestore } from './client'
import { FIRESTORE_COLLECTIONS } from './paths'
import { stripUndefined } from './sanitize'
import { logAgentActivity } from '@/lib/agentActivityLog'

const SETTINGS_DOC = 'discovery'

function settingsRef(uid: string) {
  const db = getFirebaseFirestore()
  if (!db) return null
  return doc(
    db,
    FIRESTORE_COLLECTIONS.users,
    uid,
    FIRESTORE_COLLECTIONS.settings,
    SETTINGS_DOC,
  )
}

export async function pushDiscoveryPreferences(uid: string): Promise<boolean> {
  const ref = settingsRef(uid)
  if (!ref) return false
  const prefs = loadDiscoveryPreferences()
  await setDoc(
    ref,
    stripUndefined({
      ...prefs,
      _serverUpdatedAt: serverTimestamp(),
      cloudSyncedAt: new Date().toISOString(),
    }),
    { merge: true },
  )
  logAgentActivity('firebase.sync.push_prefs', { uid }, { source: 'firebase' })
  return true
}

export async function pullDiscoveryPreferences(uid: string): Promise<DiscoveryPreferences | null> {
  const ref = settingsRef(uid)
  if (!ref) return null
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  const prefs = parseDiscoveryPreferences(data)
  // Prefer cloud if newer
  const local = loadDiscoveryPreferences()
  const cloudAt = typeof data.updatedAt === 'string' ? data.updatedAt : ''
  const localAt = local.updatedAt || ''
  if (!cloudAt || cloudAt >= localAt) {
    saveDiscoveryPreferences(prefs)
    logAgentActivity('firebase.sync.pull_prefs', { uid, applied: true }, { source: 'firebase' })
    return prefs
  }
  logAgentActivity('firebase.sync.pull_prefs', { uid, applied: false }, { source: 'firebase' })
  return local
}

export async function syncDiscoveryPreferences(uid: string): Promise<'pushed' | 'pulled' | 'none'> {
  const ref = settingsRef(uid)
  if (!ref) return 'none'
  const snap = await getDoc(ref)
  const local = loadDiscoveryPreferences()
  if (!snap.exists()) {
    await pushDiscoveryPreferences(uid)
    return 'pushed'
  }
  const data = snap.data()
  const cloudAt = typeof data.updatedAt === 'string' ? data.updatedAt : ''
  if (cloudAt && cloudAt > (local.updatedAt || '')) {
    await pullDiscoveryPreferences(uid)
    return 'pulled'
  }
  await pushDiscoveryPreferences(uid)
  return 'pushed'
}
