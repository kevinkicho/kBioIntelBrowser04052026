/**
 * Firebase Admin (server-only). Optional — used by API routes / Functions later.
 * Credentials: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_CREDENTIALS_JSON.
 *
 * Never import this from client components.
 */

import 'server-only'
import { cert, getApps, initializeApp, type App, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getDatabase } from 'firebase-admin/database'
import { getStorage } from 'firebase-admin/storage'

function initAdmin(): App | null {
  if (getApps().length) return getApps()[0]!

  try {
    const json = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON
    if (json) {
      const serviceAccount = JSON.parse(json) as {
        project_id?: string
        client_email?: string
        private_key?: string
      }
      return initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
    }

    // Application default credentials (local GOOGLE_APPLICATION_CREDENTIALS path)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG) {
      return initializeApp({
        credential: applicationDefault(),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
    }
  } catch (err) {
    console.warn('[firebase-admin] init failed:', err)
  }
  return null
}

export function getAdminApp(): App | null {
  return initAdmin()
}

export function getAdminAuth() {
  const app = getAdminApp()
  return app ? getAuth(app) : null
}

export function getAdminFirestore() {
  const app = getAdminApp()
  return app ? getFirestore(app) : null
}

export function getAdminDatabase() {
  const app = getAdminApp()
  return app ? getDatabase(app) : null
}

export function getAdminStorage() {
  const app = getAdminApp()
  return app ? getStorage(app) : null
}

export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_ADMIN_CREDENTIALS_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_CONFIG
  )
}
