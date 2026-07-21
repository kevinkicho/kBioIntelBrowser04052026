'use client'

/**
 * Global AI generation history — dense full-width list, expandable rows.
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

const PAGE_SIZE = 30

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

export default function AiHistoryPage() {
  const auth = useFirebaseAuth()
  const [kind, setKind] = useState<AiDataKind | 'all'>('all')
  const [items, setItems] = useState<AiGeneratedRecord[]>([])
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<'cloud' | 'local'>('local')
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showRawJsonId, setShowRawJsonId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const load = useCallback(
    async (append: boolean, pageCursor: { createdAt: string; id: string } | null) => {
      setLoading(true)
      setError(null)
      try {
        const page = await listAiHistoryPage({
          kind: kind === 'all' ? undefined : kind,
          pageSize: PAGE_SIZE,
          cursor: append ? pageCursor : null,
        })
        setItems((prev) => (append ? [...prev, ...page.items] : page.items))
        setCursor(page.nextCursor)
        setHasMore(page.hasMore)
        setSource(page.source)
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
    void load(false, null)
  }, [kind, load])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter((e) => {
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
        e.context?.projectId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [items, q])

  function toggleExpand(id: string) {
    setExpandedId((cur) => (cur === id ? null : id))
    if (showRawJsonId === id) setShowRawJsonId(null)
  }

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      {/* Full main-canvas width — dense list, not narrow cards */}
      <div className="page-canvas-tight">
        <header className="mb-3 flex flex-col gap-2 border-b border-slate-800/80 pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
              AI generation history
            </h1>
            <p className="mt-0.5 max-w-4xl text-[12px] leading-snug text-slate-500">
              Dense list of live model runs — click a row to expand structured output, prompts, and
              notes. Of-record Discover ranks stay free-API scores. No mock data.
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
              {' · '}
              <span className="tabular-nums text-slate-500">
                {filtered.length}
                {hasMore ? '+' : ''} shown
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter loaded rows…"
              className="w-full min-w-[12rem] rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 sm:w-56"
              data-testid="ai-history-search"
            />
          </div>
        </header>

        <div className="mb-2 flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded border px-2 py-0.5 text-[10px] ${
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

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        {loading && items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No generations yet. Run AI on Discover, board, pack, RH, disease, lab, or Copilot.
          </p>
        )}
        {!loading && items.length > 0 && filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">No rows match this filter.</p>
        )}

        {filtered.length > 0 && (
          <div
            className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40"
            data-testid="ai-history-list"
          >
            {/* Column header */}
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
              {filtered.map((entry) => {
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
                        <span className="sm:hidden text-[9px] text-slate-600 mr-1">Kind</span>
                        {aiKindLabel(entry.kind)}
                        {entry.error ? (
                          <span className="ml-1 text-[9px] text-red-400">err</span>
                        ) : null}
                      </span>
                      <span
                        className="truncate font-mono text-[10px] text-slate-500"
                        title={entry.mode}
                      >
                        <span className="sm:hidden text-[9px] text-slate-600 mr-1 font-sans">
                          Mode
                        </span>
                        {entry.mode || '—'}
                      </span>
                      <span
                        className="truncate text-[11px] text-slate-400"
                        title={contextLabel(entry)}
                      >
                        <span className="sm:hidden text-[9px] text-slate-600 mr-1">Ctx</span>
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
                          {/* Primary: structured body */}
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
                              <span className="font-mono text-[9px] text-slate-600">
                                id {entry.id.slice(0, 18)}
                                {entry.id.length > 18 ? '…' : ''}
                              </span>
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

                          {/* Secondary: prompts + notes */}
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
                              {entry.ollamaUrl && (
                                <p className="font-mono break-all text-[9px]">
                                  <span className="text-slate-600 font-sans">Endpoint </span>
                                  {entry.ollamaUrl}
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

        {hasMore && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(true, cursor)}
            className="mt-3 w-full rounded-lg border border-slate-700 py-2 text-xs text-slate-400 hover:text-indigo-300 disabled:opacity-40"
            data-testid="ai-history-more"
          >
            {loading ? 'Loading…' : `Load more (${PAGE_SIZE} per page)`}
          </button>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            className="text-[11px] text-red-400/80 hover:text-red-300"
            onClick={async () => {
              if (!window.confirm('Clear local browser AI history? Cloud data is kept.')) return
              await clearAiHistoryLocal()
              setExpandedId(null)
              void load(false, null)
            }}
          >
            Clear local AI history
          </button>
          <p className="text-[10px] text-slate-600">
            Click any row to expand · structured view by default · JSON is optional audit only
          </p>
        </div>
      </div>
    </main>
  )
}
