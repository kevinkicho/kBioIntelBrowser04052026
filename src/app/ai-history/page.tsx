'use client'

/**
 * Global AI generation history — local IDB always; cloud when signed in.
 * Load messages and review prompts; regenerate from the originating surface.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  aiKindLabel,
  listAiHistoryPage,
  type AiDataKind,
  type AiGeneratedRecord,
} from '@/lib/ai/aiHistoryStore'
import { useFirebaseAuth } from '@/lib/firebase/FirebaseProvider'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'
import { clearAiHistoryLocal } from '@/lib/ai/aiHistoryIdb'

const KINDS: Array<AiDataKind | 'all'> = [
  'all',
  'discover_rank',
  'board_recommend',
  'pack',
  'rh',
  'disease',
  'copilot',
]

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

  const load = useCallback(
    async (append: boolean, pageCursor: { createdAt: string; id: string } | null) => {
      setLoading(true)
      setError(null)
      try {
        const page = await listAiHistoryPage({
          kind: kind === 'all' ? undefined : kind,
          pageSize: 12,
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
    void load(false, null)
  }, [kind, load])

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">AI generation history</h1>
          <p className="mt-1 text-sm text-slate-400">
            Paginated history of AI outputs for learning and restore. Stored in this browser
            {auth.user ? ' and your cloud account when signed in' : ' (sign in to sync cloud)'}.
            Of-record Discover ranks stay deterministic free-API scores.
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Source: {source === 'cloud' ? 'Firestore' : 'local IndexedDB'} ·{' '}
            <Link href="/discover" className="text-indigo-400 hover:underline">
              Discover
            </Link>
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] ${
                kind === k
                  ? 'border-indigo-600 bg-indigo-900/40 text-indigo-200'
                  : 'border-slate-700 text-slate-500 hover:border-slate-600'
              }`}
              data-testid={`ai-history-filter-${k}`}
            >
              {k === 'all' ? 'All' : aiKindLabel(k)}
            </button>
          ))}
        </div>

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        {loading && items.length === 0 && (
          <p className="text-sm text-slate-500">Loading…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500">
            No generations yet. Run AI analysis on Discover, board, pack, RH, disease, or
            Copilot.
          </p>
        )}

        <ul className="space-y-2">
          {items.map((entry) => {
            const expanded = expandedId === entry.id
            return (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-3"
                data-testid="ai-history-item"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium text-slate-200">
                      {aiKindLabel(entry.kind)}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-slate-500">{entry.mode}</span>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                      {entry.context?.name ? ` · ${entry.context.name}` : ''}
                      {entry.model ? ` · ${entry.model}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-indigo-300"
                    onClick={() => setExpandedId(expanded ? null : entry.id)}
                  >
                    {expanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400 line-clamp-3">
                  {(entry.content || entry.error || '').slice(0, 280)}
                </p>
                {expanded && (
                  <div className="mt-3 space-y-2 border-t border-slate-800 pt-2">
                    <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap text-[10px] text-slate-400">
                      {entry.content || entry.error || ''}
                    </pre>
                    <AiPromptReveal
                      system={entry.promptSystem}
                      user={entry.promptUser}
                      mode={entry.mode}
                      testId={`ai-history-prompt-${entry.id}`}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {hasMore && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(true, cursor)}
            className="mt-4 w-full rounded-lg border border-slate-700 py-2 text-xs text-slate-400 hover:text-indigo-300 disabled:opacity-40"
            data-testid="ai-history-more"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        )}

        <div className="mt-8 border-t border-slate-800 pt-4">
          <button
            type="button"
            className="text-[11px] text-red-400/80 hover:text-red-300"
            onClick={async () => {
              if (!window.confirm('Clear local browser AI history? Cloud data is kept.')) return
              await clearAiHistoryLocal()
              void load(false, null)
            }}
          >
            Clear local AI history
          </button>
        </div>
      </div>
    </main>
  )
}
