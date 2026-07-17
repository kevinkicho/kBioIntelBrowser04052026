'use client'

/**
 * Firebase Auth + cloud profile context.
 * App still runs without sign-in; cloud features require Auth.
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
import {
  ensureUserProfile,
  setUserPresenceOffline,
  setUserPresenceOnline,
  type CloudUserProfile,
} from './userProfile'
import { maybeAutoMigrateOnLogin, runFirebaseMigration, type MigrationReport } from './migrate'
import {
  disableProjectWriteThrough,
  enableProjectWriteThrough,
  setWriteThroughUid,
} from './writeThrough'
import { logAgentActivity } from '@/lib/agentActivityLog'

export type FirebaseAuthState = {
  configured: boolean
  ready: boolean
  user: User | null
  profile: CloudUserProfile | null
  error: string | null
  lastMigration: MigrationReport | null
  migrating: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** Manual full sync: local ↔ Firestore projects + prefs */
  syncNow: () => Promise<MigrationReport | null>
}

const FirebaseAuthContext = createContext<FirebaseAuthState | null>(null)

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured()
  const [ready, setReady] = useState(!configured)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<CloudUserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastMigration, setLastMigration] = useState<MigrationReport | null>(null)
  const [migrating, setMigrating] = useState(false)

  // Best-effort cloud write-through for local project save/delete
  useEffect(() => {
    if (!configured) return
    enableProjectWriteThrough()
    return () => {
      disableProjectWriteThrough()
      setWriteThroughUid(null)
    }
  }, [configured])

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

    let cancelled = false
    const unsub = onAuthStateChanged(auth, (u) => {
      void (async () => {
        if (cancelled) return
        setUser(u)
        setWriteThroughUid(u?.uid ?? null)
        if (!u) {
          setProfile(null)
          setLastMigration(null)
          setReady(true)
          return
        }
        try {
          const p = await ensureUserProfile(u)
          if (!cancelled) setProfile(p)
          await setUserPresenceOnline(u.uid)
          logAgentActivity(
            'firebase.auth.signed_in',
            { uid: u.uid, provider: u.providerData[0]?.providerId ?? 'unknown' },
            { source: 'firebase' },
          )
          // Auto-migrate local projects/prefs ↔ cloud (throttled)
          setMigrating(true)
          try {
            const report = await maybeAutoMigrateOnLogin(u.uid)
            if (!cancelled && report) setLastMigration(report)
          } catch (migErr) {
            if (!cancelled) {
              setError(
                migErr instanceof Error ? migErr.message : 'Cloud sync failed',
              )
            }
          } finally {
            if (!cancelled) setMigrating(false)
          }
        } catch (err) {
          if (!cancelled) {
            setProfile({
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
            })
            setError(err instanceof Error ? err.message : 'Failed to load profile')
          }
        } finally {
          if (!cancelled) setReady(true)
        }
      })()
    })

    return () => {
      cancelled = true
      setWriteThroughUid(null)
      unsub()
    }
  }, [configured])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const auth = getFirebaseAuth()
    if (!auth) {
      setError('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env and restart dev.')
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

  const signOut = useCallback(async () => {
    setError(null)
    const auth = getFirebaseAuth()
    if (!auth) return
    const uid = auth.currentUser?.uid
    try {
      if (uid) await setUserPresenceOffline(uid)
      await firebaseSignOut(auth)
      setWriteThroughUid(null)
      setProfile(null)
      setLastMigration(null)
      logAgentActivity('firebase.auth.signed_out', {}, { source: 'firebase' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-out failed')
    }
  }, [])

  const syncNow = useCallback(async () => {
    const auth = getFirebaseAuth()
    const uid = auth?.currentUser?.uid
    if (!uid) return null
    setMigrating(true)
    setError(null)
    try {
      const report = await runFirebaseMigration(uid)
      setLastMigration(report)
      if (!report.ok) setError(report.message)
      return report
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      setError(msg)
      return null
    } finally {
      setMigrating(false)
    }
  }, [])

  const value = useMemo<FirebaseAuthState>(
    () => ({
      configured,
      ready,
      user,
      profile,
      error,
      lastMigration,
      migrating,
      signInWithGoogle,
      signOut,
      syncNow,
    }),
    [
      configured,
      ready,
      user,
      profile,
      error,
      lastMigration,
      migrating,
      signInWithGoogle,
      signOut,
      syncNow,
    ],
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
      profile: null,
      error: null,
      lastMigration: null,
      migrating: false,
      signInWithGoogle: async () => {},
      signOut: async () => {},
      syncNow: async () => null,
    }
  }
  return ctx
}
