/**
 * AI settings (Ollama Cloud API key) ↔ Firestore users/{uid}/settings/ai
 * Owner-only via firestore.rules settings/* match.
 */

import { doc, getDoc, setDoc, serverTimestamp, deleteField } from 'firebase/firestore'
import { getFirebaseFirestore } from './client'
import { FIRESTORE_COLLECTIONS } from './paths'
import { stripUndefined } from './sanitize'
import {
  loadLocalOllamaApiKey,
  saveLocalOllamaApiKey,
  clearLocalOllamaApiKey,
} from '@/lib/ai/userApiKey'
import { logAgentActivity } from '@/lib/agentActivityLog'

const AI_SETTINGS_DOC = 'ai'

export type CloudAiSettings = {
  ollamaApiKey?: string
  updatedAt?: string
}

function aiSettingsRef(uid: string) {
  const db = getFirebaseFirestore()
  if (!db) return null
  return doc(
    db,
    FIRESTORE_COLLECTIONS.users,
    uid,
    FIRESTORE_COLLECTIONS.settings,
    AI_SETTINGS_DOC,
  )
}

export async function pushAiSettings(uid: string, apiKey?: string): Promise<boolean> {
  const ref = aiSettingsRef(uid)
  if (!ref) return false
  const key = (apiKey ?? loadLocalOllamaApiKey()).trim()
  if (!key) {
    // Clear cloud key if local emptied
    await setDoc(
      ref,
      {
        ollamaApiKey: deleteField(),
        updatedAt: new Date().toISOString(),
        _serverUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    logAgentActivity('firebase.ai_settings.clear', { uid }, { source: 'firebase' })
    return true
  }
  await setDoc(
    ref,
    stripUndefined({
      ollamaApiKey: key,
      updatedAt: new Date().toISOString(),
      _serverUpdatedAt: serverTimestamp(),
      cloudSchema: 1,
    }),
    { merge: true },
  )
  logAgentActivity(
    'firebase.ai_settings.push',
    { uid, hasKey: true },
    { source: 'firebase' },
  )
  return true
}

export async function pullAiSettings(uid: string): Promise<CloudAiSettings | null> {
  const ref = aiSettingsRef(uid)
  if (!ref) return null
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  const key = typeof data.ollamaApiKey === 'string' ? data.ollamaApiKey.trim() : ''
  const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : undefined
  if (key) {
    saveLocalOllamaApiKey(key)
    logAgentActivity(
      'firebase.ai_settings.pull',
      { uid, hasKey: true },
      { source: 'firebase' },
    )
  }
  return { ollamaApiKey: key || undefined, updatedAt }
}

/**
 * Prefer newer cloud key when present; otherwise push local if any.
 */
export async function syncAiSettings(uid: string): Promise<'pushed' | 'pulled' | 'none'> {
  const ref = aiSettingsRef(uid)
  if (!ref) return 'none'
  const local = loadLocalOllamaApiKey()
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    if (local) {
      await pushAiSettings(uid, local)
      return 'pushed'
    }
    return 'none'
  }
  const data = snap.data()
  const cloudKey = typeof data.ollamaApiKey === 'string' ? data.ollamaApiKey.trim() : ''
  if (cloudKey) {
    if (cloudKey !== local) saveLocalOllamaApiKey(cloudKey)
    return 'pulled'
  }
  if (local) {
    await pushAiSettings(uid, local)
    return 'pushed'
  }
  return 'none'
}

export async function clearCloudAiSettings(uid: string): Promise<void> {
  clearLocalOllamaApiKey()
  await pushAiSettings(uid, '')
}
