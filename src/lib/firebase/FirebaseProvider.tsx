'use client'

/**
 * Optional Firebase Auth context.
 * Local workspace (localStorage) remains the default identity when Auth is off
 * or the user has not signed in — product law: solo + file export default.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from './client'
import { writeLocalSession } from '@/lib/localSession'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type FirebaseAuthState = {
  configured: boolean
  ready: boolean
  user: User | null
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOutCloud: () => Promise<void>
}

const FirebaseAuthContext = createContext<FirebaseAuthState | null>(null)

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured()
  const [ready, setReady] = useState(!configured)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!configured) {
      setReady(true)
      return
    }
    const auth = getFirebaseAuth()
    if (!auth) {
      setReady(true)
      return
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setReady(true)
      if (u) {
        // Mirror display name into local workspace label (optional sync)
        const name = u.displayName || u.email || 'Cloud user'
        writeLocalSession({ displayName: name.slice(0, 48) })
        logAgentActivity(
          'firebase.auth.signed_in',
          { uid: u.uid, provider: u.providerData[0]?.providerId ?? 'unknown' },
          { source: 'firebase' },
        )
      }
    })
    return () => unsub()
  }, [configured])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const auth = getFirebaseAuth()
    if (!auth) {
      setError('Firebase is not configured (missing NEXT_PUBLIC_FIREBASE_* env).')
      return
    }
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed'
      setError(msg)
      logAgentActivity('firebase.auth.error', { message: msg }, { source: 'firebase', level: 'error' })
    }
  }, [])

  const signOutCloud = useCallback(async () => {
    setError(null)
    const auth = getFirebaseAuth()
    if (!auth) return
    try {
      await firebaseSignOut(auth)
      logAgentActivity('firebase.auth.signed_out', {}, { source: 'firebase' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-out failed')
    }
  }, [])

  const value = useMemo<FirebaseAuthState>(
    () => ({
      configured,
      ready,
      user,
      error,
      signInWithGoogle,
      signOutCloud,
    }),
    [configured, ready, user, error, signInWithGoogle, signOutCloud],
  )

  return (
    <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>
  )
}

export function useFirebaseAuth(): FirebaseAuthState {
  const ctx = useContext(FirebaseAuthContext)
  if (!ctx) {
    return {
      configured: false,
      ready: true,
      user: null,
      error: null,
      signInWithGoogle: async () => {},
      signOutCloud: async () => {},
    }
  }
  return ctx
}
