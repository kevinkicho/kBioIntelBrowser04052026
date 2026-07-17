/**
 * Firebase web config from env (see .env.local.example).
 * Values are optional until Firebase client features are wired.
 */

export type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  databaseURL?: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export function getFirebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    ...(databaseURL ? { databaseURL } : {}),
  }
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseWebConfig() != null
}
