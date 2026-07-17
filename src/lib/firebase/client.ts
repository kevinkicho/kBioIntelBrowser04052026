/**
 * Browser Firebase app singleton (optional).
 * Product remains usable without Firebase (solo + localStorage default).
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getDatabase, type Database } from 'firebase/database'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getFirebaseWebConfig, isFirebaseConfigured } from './config'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let rtdb: Database | null = null
let storage: FirebaseStorage | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null
  if (!isFirebaseConfigured()) return null
  if (app) return app
  const config = getFirebaseWebConfig()
  if (!config) return null
  app = getApps().length ? getApp() : initializeApp(config)
  return app
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp()
  if (!a) return null
  if (!auth) auth = getAuth(a)
  return auth
}

export function getFirebaseFirestore(): Firestore | null {
  const a = getFirebaseApp()
  if (!a) return null
  if (!db) db = getFirestore(a)
  return db
}

export function getFirebaseRtdb(): Database | null {
  const a = getFirebaseApp()
  if (!a) return null
  if (!rtdb) rtdb = getDatabase(a)
  return rtdb
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const a = getFirebaseApp()
  if (!a) return null
  if (!storage) storage = getStorage(a)
  return storage
}

export { isFirebaseConfigured }
