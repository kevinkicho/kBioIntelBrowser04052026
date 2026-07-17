'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  endLocalSession,
  initialsFromName,
  readLocalSession,
  writeLocalSession,
  type LocalSession,
} from '@/lib/localSession'
import { clearAllProfileRevisitCache } from '@/lib/profileClientCache'
import { clearSearchHistory } from '@/lib/searchHistory'
import { useAI } from '@/lib/ai/useAI'

const QUICK_LINKS: { href: string; label: string; desc: string }[] = [
  { href: '/projects', label: 'Projects', desc: 'Boards & evidence packs' },
  { href: '/discover', label: 'Discover', desc: 'Rank shortlist' },
  { href: '/analytics', label: 'Analytics', desc: 'API + product funnel' },
  { href: '/watchlist', label: 'Watchlist', desc: 'Saved molecules' },
  { href: '/cohort', label: 'Cohort', desc: 'Multi-molecule matrix' },
  { href: '/?focus=search', label: 'Home search', desc: 'Molecule / disease / gene' },
]

/**
 * Top-right workspace menu (solo local identity — not multi-tenant OAuth).
 */
export function UserMenu() {
  const router = useRouter()
  const ai = useAI()
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<LocalSession | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(() => {
    setSession(readLocalSession())
  }, [])

  useEffect(() => {
    reload()
    const onChange = () => reload()
    window.addEventListener('biointel-local-session', onChange)
    return () => window.removeEventListener('biointel-local-session', onChange)
  }, [reload])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setRenaming(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (renaming) {
      renameRef.current?.focus()
      renameRef.current?.select()
    }
  }, [renaming])

  if (!session) {
    return (
      <div
        className="h-8 w-8 animate-pulse rounded-full bg-slate-800"
        aria-hidden
        data-testid="user-menu-skeleton"
      />
    )
  }

  const initials = initialsFromName(session.displayName)
  const aiLabel =
    ai.mounted && ai.enabled && ai.status === 'available'
      ? `AI · ${ai.model || 'ready'}`
      : ai.mounted && ai.enabled
        ? 'AI · offline'
        : 'AI · off'

  const startRename = () => {
    setNameDraft(session.displayName)
    setRenaming(true)
  }

  const commitRename = () => {
    const next = writeLocalSession({ displayName: nameDraft })
    setSession(next)
    setRenaming(false)
  }

  const onClearProfileCache = async () => {
    setBusy(true)
    try {
      await clearAllProfileRevisitCache()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  const onClearHistory = () => {
    if (!window.confirm('Clear all search history entries?')) return
    clearSearchHistory()
    window.dispatchEvent(new Event('biointel-search-history'))
    setOpen(false)
  }

  const onLogout = async () => {
    const ok = window.confirm(
      'Sign out of this browser session?\n\n' +
        '• Clears search history, profile panel cache, and local product-event queue\n' +
        '• Starts a fresh local workspace name\n' +
        '• Projects, packs, and preferences on this device are kept\n\n' +
        'Continue?',
    )
    if (!ok) return
    setBusy(true)
    try {
      if (ai.mounted && ai.enabled && typeof ai.disconnect === 'function') {
        try {
          ai.disconnect()
        } catch {
          /* ignore */
        }
      }
      const next = await endLocalSession()
      setSession(next)
      setOpen(false)
      router.push('/')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative" ref={rootRef} data-testid="user-menu">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 py-1 pl-1 pr-2 text-left transition-colors hover:border-slate-600 hover:bg-slate-800/80"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Workspace menu for ${session.displayName}`}
        data-testid="user-menu-trigger"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-indigo-800 text-[10px] font-semibold text-emerald-50 ring-1 ring-emerald-500/30"
          aria-hidden
        >
          {initials}
        </span>
        <span className="hidden max-w-[7rem] truncate text-xs text-slate-300 sm:inline">
          {session.displayName}
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
          <div className="border-b border-slate-800 px-3 py-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-indigo-800 text-xs font-semibold text-emerald-50">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                {renaming ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      commitRename()
                    }}
                    className="flex gap-1"
                  >
                    <input
                      ref={renameRef}
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={() => commitRename()}
                      className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                      maxLength={48}
                      aria-label="Display name"
                      data-testid="user-menu-rename-input"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={startRename}
                    className="block max-w-full truncate text-left text-sm font-medium text-slate-100 hover:text-white"
                    title="Click to rename"
                    data-testid="user-menu-display-name"
                  >
                    {session.displayName}
                  </button>
                )}
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Local workspace · solo (no cloud login)
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-slate-600" title={session.sessionId}>
                  {session.sessionId.slice(0, 18)}…
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[9px] text-slate-400">
                {aiLabel}
              </span>
              <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-2 py-0.5 text-[9px] text-emerald-400/90">
                Free APIs only
              </span>
            </div>
          </div>

          <div className="border-b border-slate-800 py-1">
            <p className="px-3 py-1 text-[9px] font-medium uppercase tracking-wider text-slate-600">
              Go to
            </p>
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex flex-col px-3 py-1.5 hover:bg-slate-800/60"
              >
                <span className="text-xs text-slate-200">{item.label}</span>
                <span className="text-[10px] text-slate-600">{item.desc}</span>
              </Link>
            ))}
          </div>

          <div className="border-b border-slate-800 py-1">
            <p className="px-3 py-1 text-[9px] font-medium uppercase tracking-wider text-slate-600">
              Data on this device
            </p>
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => void onClearProfileCache()}
              className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-slate-800/60 disabled:opacity-50"
              data-testid="user-menu-clear-profile-cache"
            >
              <span className="text-xs text-slate-200">Clear profile cache</span>
              <span className="text-[10px] text-slate-600">
                Category / pipeline revisit data (keeps history)
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={onClearHistory}
              className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-slate-800/60 disabled:opacity-50"
              data-testid="user-menu-clear-history"
            >
              <span className="text-xs text-slate-200">Clear search history</span>
              <span className="text-[10px] text-slate-600">Left sidebar entries only</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={startRename}
              className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-slate-800/60"
              data-testid="user-menu-rename"
            >
              <span className="text-xs text-slate-200">Rename workspace</span>
              <span className="text-[10px] text-slate-600">Local display label only</span>
            </button>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => void onLogout()}
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
            <p className="px-2.5 pb-1.5 pt-0.5 text-[9px] leading-snug text-slate-600">
              Solo product: no cloud account. Sign out ends this browser session and clears browsing
              residue; projects stay on-device.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
