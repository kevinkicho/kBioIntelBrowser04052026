'use client'

/**
 * Global AI generation history — dense list with filter, sort, pagination.
 * Structured rendering preferred; pretty-printed JSON only as optional audit view.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  aiKindLabel,
  listAiHistoryPage,
  type AiDataKind,
  type AiGeneratedRecord,
} from '@/lib/ai/aiHistoryStore'
import { useFirebaseAuth } from '@/lib/firebase/FirebaseProvider'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'
import { AiUserComment } from '@/components/ai/AiUserComment'
import { AiGenerationView } from '@/components/ai/AiGenerationView'
import {
  formatAiGeneration,
  formatAiGenerationPreview,
} from '@/lib/ai/formatAiGeneration'
import { clearAiHistoryLocal } from '@/lib/ai/aiHistoryIdb'

const KINDS: Array<AiDataKind | 'all'> = [
  'all',
  'discover_rank',
  'board_recommend',
  'pack',
  'rh',
  'research_lab',
  'disease',
  'copilot',
  'other',
]

type SortKey = 'newest' | 'oldest' | 'kind' | 'mode' | 'context'

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'kind', label: 'Kind' },
  { id: 'mode', label: 'Mode' },
  { id: 'context', label: 'Context' },
]

const PAGE_SIZE_OPTIONS = [15, 30, 50] as const

/** Pretty-print JSON when content/task is structured; else null. */
function prettyJsonForEntry(entry: AiGeneratedRecord): string | null {
  if (entry.task != null) {
    try {
      return JSON.stringify(entry.task, null, 2)
    } catch {
      /* fall through */
    }
  }
  const raw = (entry.content || '').trim()
  if (!raw) return null
  if (!(raw.startsWith('{') || raw.startsWith('['))) return null
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return null
  }
}

function contextLabel(entry: AiGeneratedRecord): string {
  const c = entry.context
  if (!c) return '—'
  const parts = [
    c.name,
    c.cid != null ? `CID ${c.cid}` : null,
    c.geneSymbol,
    c.diseaseId,
    c.packId ? `pack ${c.packId.slice(0, 10)}…` : null,
    c.projectId ? `proj ${c.projectId.slice(0, 8)}…` : null,
    c.hypId ? `rh ${c.hypId.slice(0, 8)}…` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

function sortEntries(list: AiGeneratedRecord[], sort: SortKey): AiGeneratedRecord[] {
  const arr = [...list]
  arr.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      case 'kind':
        return (
          String(a.kind).localeCompare(String(b.kind)) ||
          String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        )
      case 'mode':
        return (
          String(a.mode || '').localeCompare(String(b.mode || '')) ||
          String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        )
      case 'context':
        return (
          contextLabel(a).localeCompare(contextLabel(b)) ||
          String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        )
      case 'newest':
      default:
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    }
  })
  return arr
}

export default function AiHistoryPage() {
  const auth = useFirebaseAuth()
  const [kind, setKind] = useState<AiDataKind | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(30)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AiGeneratedRecord[]>([])
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<'cloud' | 'local'>('local')
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showRawJsonId, setShowRawJsonId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [clearArmed, setClearArmed] = useState(false)

  const load = useCallback(
    async (append: boolean, pageCursor: { createdAt: string; id: string } | null) => {
      setLoading(true)
      setError(null)
      try {
        const pageResult = await listAiHistoryPage({
          kind: kind === 'all' ? undefined : kind,
          pageSize: 50,
          cursor: append ? pageCursor : null,
        })
        setItems((prev) => (append ? [...prev, ...pageResult.items] : pageResult.items))
        setCursor(pageResult.nextCursor)
        setHasMore(pageResult.hasMore)
        setSource(pageResult.source)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    },
    [kind],
  )

  useEffect(() => {
    setCursor(null)
    setExpandedId(null)
    setShowRawJsonId(null)
    setPage(1)
    setClearArmed(false)
    void load(false, null)
  }, [kind, load])

  useEffect(() => {
    setPage(1)
  }, [q, sort, pageSize])

  const filteredSorted = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = items
    if (needle) {
      list = items.filter((e) => {
        const hay = [
          e.kind,
          e.mode,
          e.model,
          e.content,
          e.error,
          e.userComment,
          e.context?.name,
          e.context?.geneSymbol,
          String(e.context?.cid ?? ''),
          e.context?.packId,
          e.projectId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
    }
    return sortEntries(list, sort)
  }, [items, q, sort])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize) || 1)
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredSorted.slice(start, start + pageSize)
  }, [filteredSorted, safePage, pageSize])

  function toggleExpand(id: string) {
    setExpandedId((cur) => (cur === id ? null : id))
    if (showRawJsonId === id) setShowRawJsonId(null)
  }

  async function handleClearLocal() {
    if (!clearArmed) {
      setClearArmed(true)
      return
    }
    const ok = window.confirm(
      'Clear all local AI generation history in this browser?\n\nThis cannot be undone. Cloud history (if signed in) is kept.',
    )
    if (!ok) {
      setClearArmed(false)
      return
    }
    await clearAiHistoryLocal()
    setClearArmed(false)
    setExpandedId(null)
    setItems([])
    setCursor(null)
    setHasMore(false)
    setPage(1)
    void load(false, null)
  }

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="page-canvas-tight">
        <header className="mb-3 flex flex-col gap-2 border-b border-slate-800/80 pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
              AI generation history
            </h1>
            <p className="mt-0.5 max-w-4xl text-[12px] leading-snug text-slate-500">
              Filter, sort, and page through live model runs. Click a row to expand structured
              output, prompts, and notes. Of-record Discover ranks stay free-API scores.
            </p>
            <p className="mt-1 text-[10px] text-slate-600">
              Source: {source === 'cloud' ? 'Firestore' : 'local IndexedDB'}
              {auth.user ? ' · signed in' : ' · sign in to sync cloud'} ·{' '}
              <Link href="/discover" className="text-indigo-400 hover:underline">
                Discover
              </Link>
              {' · '}
              <Link href="/projects" className="text-indigo-400 hover:underline">
                Projects
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search text, mode, context…"
              className="w-full min-w-[12rem] rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 sm:w-56"
              data-testid="ai-history-search"
            />
          </div>
        </header>

        {/* Kind filters + Clear on one row */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] ${
                  kind === k
                    ? 'border-indigo-600 bg-indigo-900/40 text-indigo-200'
                    : 'border-slate-800 text-slate-500 hover:border-slate-600'
                }`}
                data-testid={`ai-history-filter-${k}`}
              >
                {k === 'all' ? 'All' : aiKindLabel(k)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void handleClearLocal()}
            onBlur={() => {
              // disarm if user clicks away without confirming
              window.setTimeout(() => setClearArmed(false), 200)
            }}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
              clearArmed
                ? 'border-red-500 bg-red-900/50 text-red-100 ring-1 ring-red-500/40'
                : 'border-red-900/50 bg-red-950/30 text-red-300/90 hover:border-red-700 hover:text-red-200'
            }`}
            data-testid="ai-history-clear"
            title={
              clearArmed
                ? 'Click again, then confirm in the dialog'
                : 'Clear local browser AI history'
            }
          >
            {clearArmed ? 'Confirm clear?' : 'Clear'}
          </button>
        </div>

        {/* Sort + page size + pagination controls */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-[10px] font-semibold uppercase text-slate-600">Sort</span>
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={`rounded-full border px-2 py-0.5 text-[10px] ${
                sort === s.id
                  ? 'border-slate-500 bg-slate-800 text-slate-200'
                  : 'border-slate-800 text-slate-500 hover:border-slate-600'
              }`}
              data-testid={`ai-history-sort-${s.id}`}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-1 text-[10px] font-semibold uppercase text-slate-600">Per page</span>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPageSize(n)}
              className={`rounded-full border px-2 py-0.5 text-[10px] tabular-nums ${
                pageSize === n
                  ? 'border-slate-500 bg-slate-800 text-slate-200'
                  : 'border-slate-800 text-slate-500 hover:border-slate-600'
              }`}
              data-testid={`ai-history-pagesize-${n}`}
            >
              {n}
            </button>
          ))}
          <span className="ml-auto flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
            <span className="tabular-nums">
              {filteredSorted.length === 0
                ? '0'
                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredSorted.length)}`}
              {' of '}
              {filteredSorted.length}
              {hasMore ? '+' : ''}
            </span>
            <button
              type="button"
              disabled={safePage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-700 px-2 py-0.5 text-slate-400 hover:text-indigo-300 disabled:opacity-30"
              data-testid="ai-history-prev"
            >
              Prev
            </button>
            <span className="tabular-nums text-slate-400">
              {safePage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-slate-700 px-2 py-0.5 text-slate-400 hover:text-indigo-300 disabled:opacity-30"
              data-testid="ai-history-next"
            >
              Next
            </button>
          </span>
        </div>

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        {loading && items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No generations yet. Run AI on Discover, board, pack, RH, disease, lab, or Copilot.
          </p>
        )}
        {!loading && items.length > 0 && filteredSorted.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">No rows match this filter.</p>
        )}

        {pageSlice.length > 0 && (
          <div
            className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40"
            data-testid="ai-history-list"
          >
            <div
              className="hidden grid-cols-[minmax(0,7rem)_minmax(0,9rem)_minmax(0,1fr)_minmax(0,2.5fr)_minmax(0,8rem)_2.5rem] gap-2 border-b border-slate-800 bg-slate-900/80 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:grid"
              role="row"
            >
              <span>Kind</span>
              <span>Mode</span>
              <span>Context</span>
              <span>Preview</span>
              <span className="text-right">When</span>
              <span className="sr-only">Expand</span>
            </div>

            <ul className="divide-y divide-slate-800/80">
              {pageSlice.map((entry) => {
                const expanded = expandedId === entry.id
                const preview = formatAiGenerationPreview(entry, 220)
                const when = entry.createdAt
                  ? new Date(entry.createdAt).toLocaleString()
                  : '—'
                const formatted = expanded ? formatAiGeneration(entry) : null
                const pretty = expanded ? prettyJsonForEntry(entry) : null
                const showJson = showRawJsonId === entry.id

                return (
                  <li key={entry.id} data-testid="ai-history-item" data-expanded={expanded}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(entry.id)}
                      className={`grid w-full grid-cols-1 gap-1 px-2 py-2 text-left transition-colors hover:bg-slate-900/70 sm:grid-cols-[minmax(0,7rem)_minmax(0,9rem)_minmax(0,1fr)_minmax(0,2.5fr)_minmax(0,8rem)_2.5rem] sm:items-center sm:gap-2 ${
                        expanded ? 'bg-slate-900/50' : ''
                      }`}
                      aria-expanded={expanded}
                      data-testid="ai-history-row"
                    >
                      <span className="text-[11px] font-medium text-slate-200">
                        {aiKindLabel(entry.kind)}
                        {entry.error ? (
                          <span className="ml-1 text-[9px] text-red-400">err</span>
                        ) : null}
                      </span>
                      <span
                        className="truncate font-mono text-[10px] text-slate-500"
                        title={entry.mode}
                      >
                        {entry.mode || '—'}
                      </span>
                      <span
                        className="truncate text-[11px] text-slate-400"
                        title={contextLabel(entry)}
                      >
                        {contextLabel(entry)}
                        {entry.model ? (
                          <span className="ml-1 font-mono text-[9px] text-slate-600">
                            · {entry.model}
                          </span>
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-snug text-slate-300 sm:line-clamp-1">
                        {preview}
                        {entry.userComment?.trim() ? (
                          <span className="ml-1 text-amber-500/80">· note</span>
                        ) : null}
                      </span>
                      <span className="text-[10px] tabular-nums text-slate-600 sm:text-right">
                        {when}
                      </span>
                      <span
                        className="hidden justify-self-end text-[10px] text-slate-500 sm:inline"
                        aria-hidden
                      >
                        {expanded ? '▾' : '▸'}
                      </span>
                    </button>

                    {expanded && (
                      <div
                        className="border-t border-slate-800/60 bg-slate-950/60 px-2 py-3 sm:px-3"
                        data-testid={`ai-history-detail-${entry.id}`}
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                              <span className="font-semibold uppercase tracking-wide text-slate-400">
                                Output
                              </span>
                              {formatted && (
                                <span className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
                                  {formatted.kind}
                                  {formatted.wasJson ? ' · from JSON' : ''}
                                </span>
                              )}
                            </div>
                            <div className="max-h-[min(28rem,55vh)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-2.5">
                              <AiGenerationView
                                entry={entry}
                                formatted={formatted}
                                density="full"
                                testId={`ai-history-body-${entry.id}`}
                              />
                            </div>
                            {pretty && (
                              <div className="rounded-lg border border-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowRawJsonId(showJson ? null : entry.id)
                                  }
                                  className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] text-slate-500 hover:text-indigo-300"
                                  data-testid={`ai-history-json-toggle-${entry.id}`}
                                >
                                  <span>
                                    {showJson ? 'Hide' : 'Show'} pretty-printed JSON (audit)
                                  </span>
                                  <span>{showJson ? '▴' : '▾'}</span>
                                </button>
                                {showJson && (
                                  <pre
                                    className="max-h-64 overflow-auto border-t border-slate-800 bg-slate-950 p-2.5 font-mono text-[10px] leading-relaxed text-slate-400 whitespace-pre"
                                    data-testid={`ai-history-json-${entry.id}`}
                                  >
                                    {pretty}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Prompt & notes
                            </p>
                            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-2 text-[10px] text-slate-500 space-y-1">
                              <p>
                                <span className="text-slate-600">Kind </span>
                                {aiKindLabel(entry.kind)}
                              </p>
                              <p className="font-mono break-all">
                                <span className="text-slate-600 font-sans">Mode </span>
                                {entry.mode}
                              </p>
                              {entry.model && (
                                <p className="font-mono">
                                  <span className="text-slate-600 font-sans">Model </span>
                                  {entry.model}
                                </p>
                              )}
                              <p>
                                <span className="text-slate-600">Created </span>
                                {when}
                              </p>
                              {entry.error && (
                                <p className="text-red-400/90 break-words">Error: {entry.error}</p>
                              )}
                            </div>
                            <AiPromptReveal
                              system={entry.promptSystem}
                              user={entry.promptUser}
                              mode={entry.mode}
                              testId={`ai-history-prompt-${entry.id}`}
                            />
                            <AiUserComment
                              generationId={entry.id}
                              initialComment={entry.userComment}
                              testId={`ai-history-comment-${entry.id}`}
                              onSaved={(comment) => {
                                setItems((prev) =>
                                  prev.map((r) =>
                                    r.id === entry.id
                                      ? {
                                          ...r,
                                          userComment: comment,
                                          commentUpdatedAt: new Date().toISOString(),
                                        }
                                      : r,
                                  ),
                                )
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Bottom pagination + load older from store */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-700 px-3 py-1.5 text-[11px] text-slate-400 hover:text-indigo-300 disabled:opacity-30"
            >
              Prev page
            </button>
            <span className="tabular-nums text-[11px] text-slate-500">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-slate-700 px-3 py-1.5 text-[11px] text-slate-400 hover:text-indigo-300 disabled:opacity-30"
            >
              Next page
            </button>
          </div>
          {hasMore && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void load(true, cursor)}
              className="rounded border border-slate-700 px-3 py-1.5 text-[11px] text-slate-400 hover:text-indigo-300 disabled:opacity-40"
              data-testid="ai-history-more"
            >
              {loading ? 'Loading…' : 'Load older from storage'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
