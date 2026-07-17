/**
 * Firestore user profile + RTDB presence (owner-scoped).
 */

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import { onDisconnect, ref, set, type Database } from 'firebase/database'
import type { User } from 'firebase/auth'
import { getFirebaseFirestore, getFirebaseRtdb } from './client'
import { FIRESTORE_COLLECTIONS, rtdbPresencePath, userDocPath } from './paths'

export type CloudUserProfile = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  createdAt?: unknown
  lastLoginAt?: unknown
  providerIds?: string[]
}

export async function ensureUserProfile(user: User): Promise<CloudUserProfile | null> {
  const db = getFirebaseFirestore()
  if (!db) return null

  const refDoc = doc(db, userDocPath(user.uid))
  const snap = await getDoc(refDoc)
  const providerIds = user.providerData.map((p) => p.providerId).filter(Boolean)
  const base: CloudUserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    providerIds,
  }

  if (!snap.exists()) {
    await setDoc(refDoc, {
      ...base,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    })
  } else {
    await setDoc(
      refDoc,
      {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        providerIds,
        lastLoginAt: serverTimestamp(),
      },
      { merge: true },
    )
  }

  return base
}

export async function loadUserProfile(uid: string): Promise<CloudUserProfile | null> {
  const db = getFirebaseFirestore()
  if (!db) return null
  const snap = await getDoc(doc(db, userDocPath(uid)))
  if (!snap.exists()) return null
  return snap.data() as CloudUserProfile
}

/** Best-effort presence; fails silently if RTDB offline/rules block. */
export async function setUserPresenceOnline(uid: string): Promise<void> {
  const rtdb = getFirebaseRtdb()
  if (!rtdb) return
  try {
    const presenceRef = ref(rtdb, rtdbPresencePath(uid))
    await set(presenceRef, {
      state: 'online',
      updatedAt: Date.now(),
    })
    await onDisconnect(presenceRef).set({
      state: 'offline',
      updatedAt: Date.now(),
    })
  } catch {
    /* non-fatal */
  }
}

export async function setUserPresenceOffline(uid: string): Promise<void> {
  const rtdb = getFirebaseRtdb()
  if (!rtdb) return
  try {
    await set(ref(rtdb, rtdbPresencePath(uid)), {
      state: 'offline',
      updatedAt: Date.now(),
    })
  } catch {
    /* non-fatal */
  }
}

export async function countUserProjects(uid: string): Promise<number | null> {
  const db = getFirebaseFirestore()
  if (!db) return null
  try {
    const { collection, getDocs } = await import('firebase/firestore')
    const col = collection(
      db,
      FIRESTORE_COLLECTIONS.users,
      uid,
      FIRESTORE_COLLECTIONS.projects,
    )
    const snap = await getDocs(col)
    return snap.size
  } catch {
    return null
  }
}

export function firestoreReady(): Firestore | null {
  return getFirebaseFirestore()
}

export function rtdbReady(): Database | null {
  return getFirebaseRtdb()
}
