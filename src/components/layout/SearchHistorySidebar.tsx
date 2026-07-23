'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import {
  type SearchHistoryEntry,
  type SearchHistoryFilter,
  type SearchHistorySort,
  hrefWithRefresh,
  kindLabel,
} from '@/lib/searchHistory'
import { clearAllProfileRevisitCache } from '@/lib/profileClientCache'
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

const FILTERS: { id: SearchHistoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'molecule', label: 'Mol' },
  { id: 'disease', label: 'Dis' },
  { id: 'gene', label: 'Gene' },
  { id: 'discover', label: 'Disc' },
  { id: 'project', label: 'Proj' },
]

const SORTS: { id: SearchHistorySort; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'title', label: 'A–Z' },
  { id: 'visits', label: 'Visits' },
  { id: 'kind', label: 'Type' },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 14) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function kindIcon(kind: SearchHistoryEntry['kind']): string {
  switch (kind) {
    case 'molecule':
      return '🧬'
    case 'disease':
      return '🦠'
    case 'gene':
      return '🔬'
    case 'discover':
      return '🔍'
    case 'project':
      return '📋'
    default:
      return '•'
  }
}

/**
 * Highlight the history row that matches the current page + query string
 * (not just pathname — all Discover sessions share /discover).
 */
function isActiveHref(pathname: string, search: string, href: string): boolean {
  try {
    const u = new URL(href, 'http://local.invalid')
    if (pathname !== u.pathname && !pathname.startsWith(u.pathname + '/')) return false
    // Path-only kinds (e.g. /gene/123): pathname match is enough when href has no search
    if (!u.search || u.search === '?') {
      return !search || search === '?'
    }
    const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const target = u.searchParams
    // Compare meaningful discover / search params (ignore refresh bust)
    const keys = new Set([
      ...Array.from(current.keys()),
      ...Array.from(target.keys()),
    ])
    keys.delete('refresh')
    keys.delete('_t')
    for (const k of Array.from(keys)) {
      const a = (current.get(k) ?? '').trim()
      const b = (target.get(k) ?? '').trim()
      if (a.toLowerCase() !== b.toLowerCase()) return false
    }
    return true
  } catch {
    return pathname === href.split('?')[0]
  }
}

/**
 * Collapsible left sidebar: query history, filter/sort, open cached path, refresh.
 */
export function SearchHistorySidebar() {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : ''
  const [cacheClearing, setCacheClearing] = useState(false)
  const {
    hydrated,
    visible,
    entries,
    ui,
    setSort,
    setFilter,
    setQuery,
    setCollapsed,
    remove,
    clear,
  } = useSearchHistory()

  // Hide on embed
  if (pathname.startsWith('/embed')) return null
  if (!hydrated) return null

  const openEntry = (entry: SearchHistoryEntry, refresh: boolean) => {
    const href = refresh ? hrefWithRefresh(entry.href) : entry.href
    router.push(href)
  }

  const clearProfileCache = async () => {
    if (
      !window.confirm(
        'Clear cached profile data (categories & pipeline) for all molecules? Search history is kept. Next open will re-fetch live sources.',
      )
    ) {
      return
    }
    setCacheClearing(true)
    try {
      await clearAllProfileRevisitCache()
    } finally {
      setCacheClearing(false)
    }
  }

  if (ui.collapsed) {
    return (
      <aside
        className="fixed left-0 top-[var(--app-header-height)] z-30 flex h-[calc(100vh-var(--app-header-height))] w-10 flex-col items-center border-r border-slate-800/80 bg-[#0c0e14]/95 py-2 backdrop-blur-md"
        data-testid="search-history-sidebar-collapsed"
        aria-label="Search history (collapsed)"
      >
        <StyledTooltip content="Expand search history">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Expand search history"
            data-testid="search-history-expand"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </StyledTooltip>
        <span className="mt-3 text-[9px] font-medium uppercase tracking-wider text-slate-600 [writing-mode:vertical-rl]">
          History ({entries.length})
        </span>
      </aside>
    )
  }

  return (
    <aside
      className="fixed left-0 top-[var(--app-header-height)] z-30 flex h-[calc(100vh-var(--app-header-height))] w-[min(18rem,85vw)] flex-col border-r border-slate-800/80 bg-[#0c0e14]/95 backdrop-blur-md sm:w-72"
      data-testid="search-history-sidebar"
      aria-label="Search history"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-2.5">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-xs font-semibold text-slate-200">Search history</h2>
            <HelperTip
              content={`${entries.length} saved. Reopening a molecule uses session/disk cache when warm so panels do not re-fetch every source.`}
              label="About search history"
              testId="search-history-help"
            />
          </div>
          <p className="text-[10px] tabular-nums text-slate-500">{entries.length} saved</p>
        </div>
        <StyledTooltip content="Collapse sidebar">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Collapse search history"
            data-testid="search-history-collapse"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </StyledTooltip>
      </div>

      <div className="space-y-2 border-b border-slate-800/60 px-3 py-2">
        <input
          type="search"
          value={ui.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter history…"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none"
          data-testid="search-history-filter-input"
        />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                ui.filter === f.id
                  ? 'bg-indigo-900/50 text-indigo-200 border border-indigo-700/50'
                  : 'bg-slate-900/40 text-slate-500 border border-slate-800 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-slate-500 shrink-0">Sort</label>
          <select
            value={ui.sort}
            onChange={(e) => setSort(e.target.value as SearchHistorySort)}
            className="flex-1 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-300 focus:border-indigo-600 focus:outline-none"
            data-testid="search-history-sort"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {entries.length > 0 && (
            <StyledTooltip content="Clear all history">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all search history?')) clear()
                }}
                className="text-[10px] text-slate-600 hover:text-red-400"
                aria-label="Clear all history"
              >
                Clear
              </button>
            </StyledTooltip>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-2 py-6 text-center">
            <p className="text-[11px] text-slate-500">No searches yet</p>
            <HelperTip
              content="Molecule, disease, gene, and Discover queries appear here. Reopening a molecule uses session/disk cache when available so panels do not re-fetch from every source."
              label="About empty history"
              testId="search-history-empty-help"
            />
          </div>
        ) : (
          <ul className="space-y-1" data-testid="search-history-list">
            {visible.map((entry) => {
              const active = isActiveHref(pathname, search, entry.href)
              return (
                <li
                  key={entry.id}
                  className={`group rounded-lg border px-2 py-1.5 transition-colors ${
                    active
                      ? 'border-emerald-800/50 bg-emerald-950/30'
                      : 'border-transparent hover:border-slate-800 hover:bg-slate-900/50'
                  }`}
                  data-testid={`search-history-item-${entry.id}`}
                >
                  <div className="flex items-start gap-1.5">
                    <StyledTooltip
                      content={`Open ${entry.title} (session cache when previously loaded)`}
                      className="min-w-0 flex-1"
                    >
                      <button
                        type="button"
                        onClick={() => openEntry(entry, false)}
                        className="min-w-0 w-full flex-1 text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px]" aria-hidden>
                            {kindIcon(entry.kind)}
                          </span>
                          <span className="truncate text-xs font-medium text-slate-200">
                            {entry.title}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-5 text-[9px] text-slate-500">
                          <span className="uppercase tracking-wide text-slate-600">
                            {kindLabel(entry.kind)}
                          </span>
                          <span>{timeAgo(entry.lastVisitedAt)}</span>
                          {entry.visitCount > 1 && <span>×{entry.visitCount}</span>}
                          {entry.meta?.cid != null && (
                            <span className="font-mono">CID {entry.meta.cid}</span>
                          )}
                          {entry.meta?.candidateCount != null && (
                            <span>{entry.meta.candidateCount} candidates</span>
                          )}
                        </div>
                      </button>
                    </StyledTooltip>
                    <div className="flex shrink-0 flex-col gap-0.5 opacity-70 group-hover:opacity-100">
                      <StyledTooltip content="Refresh — re-query sources for latest data">
                        <button
                          type="button"
                          onClick={() => openEntry(entry, true)}
                          className="rounded p-1 text-slate-500 hover:bg-amber-950/40 hover:text-amber-300"
                          aria-label={`Refresh ${entry.title}`}
                          data-testid={`search-history-refresh-${entry.id}`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      </StyledTooltip>
                      <StyledTooltip content="Remove from history">
                        <button
                          type="button"
                          onClick={() => remove(entry.id)}
                          className="rounded p-1 text-slate-600 hover:bg-red-950/30 hover:text-red-400"
                          aria-label={`Remove ${entry.title}`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </StyledTooltip>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-800/60 px-3 py-2 space-y-1.5">
        <p className="text-[9px] leading-snug text-slate-600">
          <strong className="text-slate-500">Open</strong> uses session/disk cache when available.{' '}
          <strong className="text-slate-500">Refresh</strong> re-queries public APIs (slower).
        </p>
        <StyledTooltip content="Clear cached category and pipeline data (keeps search history)" className="w-full">
          <button
            type="button"
            onClick={() => void clearProfileCache()}
            disabled={cacheClearing}
            className="w-full rounded border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-500 hover:border-slate-700 hover:text-slate-300 disabled:opacity-50"
            aria-label="Clear cached category and pipeline data (keeps search history)"
            data-testid="search-history-clear-profile-cache"
          >
            {cacheClearing ? 'Clearing profile cache…' : 'Clear profile cache'}
          </button>
        </StyledTooltip>
      </div>
    </aside>
  )
}
