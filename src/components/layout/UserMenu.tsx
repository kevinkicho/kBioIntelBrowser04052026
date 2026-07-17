'use client'

/**
 * Top-right account menu — Firebase Auth only (no local mock identity).
 * Signed-out: Sign in with Google.
 * Signed-in: photo, name, email, cloud profile, sync projects/prefs, sign out.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase/FirebaseProvider'
import { countUserProjects } from '@/lib/firebase/userProfile'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { getLastMigrateAt } from '@/lib/firebase/migrate'
import { backupProjectsJsonToCloud } from '@/lib/firebase/storageSync'
import { exportProjectsToJson, listProjects } from '@/lib/project'

function initialsFromUser(name: string | null | undefined, email: string | null | undefined): string {
  const n = (name || '').trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

function formatSyncTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

export function UserMenu() {
  const router = useRouter()
  const auth = useFirebaseAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [projectCount, setProjectCount] = useState<number | null>(null)
  const [countTick, setCountTick] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const configured = auth.configured || isFirebaseConfigured()
  const user = auth.user
  const displayName = user?.displayName || auth.profile?.displayName || user?.email || 'Account'
  const email = user?.email || auth.profile?.email || null
  const photoURL = user?.photoURL || auth.profile?.photoURL || null
  const initials = initialsFromUser(displayName, email)
  const syncing = busy || auth.migrating
  const lastSyncIso = auth.lastMigration?.finishedAt ?? getLastMigrateAt()
  const lastSyncLabel = formatSyncTime(lastSyncIso)

  const refreshProjectCount = useCallback(() => {
    setCountTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!user?.uid || !open) {
      setProjectCount(null)
      return
    }
    let cancelled = false
    void countUserProjects(user.uid).then((n) => {
      if (!cancelled) setProjectCount(n)
    })
    return () => {
      cancelled = true
    }
  }, [user?.uid, open, countTick, auth.lastMigration?.finishedAt])

  const onSignIn = async () => {
    setBusy(true)
    try {
      await auth.signInWithGoogle()
    } finally {
      setBusy(false)
    }
  }

  const onSyncNow = async () => {
    setBusy(true)
    setStatusMsg(null)
    try {
      const report = await auth.syncNow()
      refreshProjectCount()
      if (report) setStatusMsg(report.message)
    } finally {
      setBusy(false)
    }
  }

  const onCloudBackup = async () => {
    if (!user?.uid) return
    setBusy(true)
    setStatusMsg(null)
    try {
      const projects = listProjects()
      if (projects.length === 0) {
        setStatusMsg('No local projects to back up.')
        return
      }
      const json = exportProjectsToJson(projects)
      const result = await backupProjectsJsonToCloud(user.uid, json)
      setStatusMsg(
        result.ok
          ? `Stored ${result.fileName} in cloud Storage.`
          : result.message,
      )
    } finally {
      setBusy(false)
    }
  }

  const onSignOut = async () => {
    setBusy(true)
    try {
      await auth.signOut()
      setOpen(false)
      router.push('/')
    } finally {
      setBusy(false)
    }
  }

  // Loading skeleton while Firebase Auth resolves
  if (configured && !auth.ready) {
    return (
      <div
        className="h-8 w-8 animate-pulse rounded-full bg-slate-800"
        aria-hidden
        data-testid="user-menu-skeleton"
      />
    )
  }

  return (
    <div className="relative" ref={rootRef} data-testid="user-menu">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 py-1 pl-1 pr-2 text-left transition-colors hover:border-slate-600 hover:bg-slate-800/80"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={user ? `Account menu for ${displayName}` : 'Account menu'}
        data-testid="user-menu-trigger"
      >
        {photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoURL}
            alt=""
            className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-600"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-700 to-indigo-800 text-[10px] font-semibold text-sky-50 ring-1 ring-sky-500/30"
            aria-hidden
          >
            {initials}
          </span>
        )}
        <span className="hidden max-w-[8rem] truncate text-xs text-slate-300 sm:inline">
          {user ? displayName : configured ? 'Sign in' : 'Account'}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-700/80 bg-[#12151e] shadow-xl shadow-black/40"
          data-testid="user-menu-panel"
        >
          {!configured ? (
            <div className="space-y-2 px-3 py-4" data-testid="user-menu-unconfigured">
              <p className="text-sm font-medium text-slate-200">Firebase not configured</p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Add <code className="text-slate-400">NEXT_PUBLIC_FIREBASE_*</code> to{' '}
                <code className="text-slate-400">.env</code> and restart the dev server. See{' '}
                <code className="text-slate-400">docs/firebase.md</code>.
              </p>
            </div>
          ) : !user ? (
            <div className="p-3" data-testid="user-menu-signed-out">
              <p className="mb-1 text-sm font-medium text-slate-100">Sign in to BioIntel</p>
              <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                Optional Google sign-in via Firebase Auth. After sign-in, local projects and discovery
                prefs can sync to your private cloud (owner-only rules). Solo local mode still works
                without an account.
              </p>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => void onSignIn()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-white px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                data-testid="user-menu-google-signin"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {busy ? 'Signing in…' : 'Sign in with Google'}
              </button>
              {auth.error && (
                <p className="mt-2 text-[10px] text-amber-400" data-testid="user-menu-firebase-error">
                  {auth.error}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="border-b border-slate-800 px-3 py-3">
                <div className="flex items-start gap-2.5">
                  {photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoURL}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-600"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-700 to-indigo-800 text-xs font-semibold text-sky-50">
                      {initials}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-slate-100"
                      data-testid="user-menu-display-name"
                    >
                      {displayName}
                    </p>
                    {email && (
                      <p className="truncate text-[11px] text-slate-400" title={email}>
                        {email}
                      </p>
                    )}
                    <p className="mt-0.5 font-mono text-[9px] text-slate-600" title={user.uid}>
                      uid {user.uid.slice(0, 12)}…
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-2 py-0.5 text-[9px] text-sky-300/90">
                    Firebase Auth
                  </span>
                  {projectCount != null && (
                    <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[9px] text-slate-400">
                      {projectCount} cloud project{projectCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                {auth.error && (
                  <p className="mt-2 text-[10px] text-amber-400" data-testid="user-menu-firebase-error">
                    {auth.error}
                  </p>
                )}
                {statusMsg && (
                  <p className="mt-2 text-[10px] text-sky-300/90" data-testid="user-menu-status">
                    {statusMsg}
                  </p>
                )}
              </div>

              <div className="border-b border-slate-800 py-1">
                <button
                  type="button"
                  role="menuitem"
                  disabled={syncing}
                  onClick={() => void onSyncNow()}
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-800/60 disabled:opacity-50"
                  data-testid="user-menu-sync"
                >
                  <span className="text-xs text-slate-200">
                    {syncing ? 'Syncing…' : 'Sync projects & prefs'}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {auth.lastMigration
                      ? auth.lastMigration.message
                      : lastSyncLabel
                        ? `Last sync ${lastSyncLabel}`
                        : 'Firestore · projects, pack meta, prefs'}
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={syncing}
                  onClick={() => void onCloudBackup()}
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-800/60 disabled:opacity-50"
                  data-testid="user-menu-cloud-backup"
                >
                  <span className="text-xs text-slate-200">
                    {busy ? 'Backing up…' : 'Backup export to Storage'}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    JSON archive under users/…/exports (optional)
                  </span>
                </button>
                <Link
                  href="/projects"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex flex-col px-3 py-2 hover:bg-slate-800/60"
                  data-testid="user-menu-projects"
                >
                  <span className="text-xs text-slate-200">Projects</span>
                  <span className="text-[10px] text-slate-600">
                    Boards & packs
                    {projectCount != null ? ` · ${projectCount} in cloud` : ' · local default'}
                  </span>
                </Link>
                <a
                  href="https://console.firebase.google.com/project/kbiointelbrowser04052026/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  className="flex flex-col px-3 py-2 hover:bg-slate-800/60"
                  data-testid="user-menu-firebase-console"
                >
                  <span className="text-xs text-slate-200">Firebase console ↗</span>
                  <span className="text-[10px] text-slate-600">Auth, Firestore, Storage, Hosting</span>
                </a>
              </div>

              <div className="p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  disabled={syncing}
                  onClick={() => void onSignOut()}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                  data-testid="user-menu-logout"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  {busy ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
