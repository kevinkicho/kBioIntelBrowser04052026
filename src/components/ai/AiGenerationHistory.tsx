'use client'

/**
 * Compact paginated history (local IDB and/or cloud).
 * Prefer AiRegenerateModal for full regenerate + load UX.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  listAiHistoryPage,
  type AiDataKind,
  type AiGeneratedRecord,
} from '@/lib/ai/aiHistoryStore'
import { AiPromptReveal } from './AiPromptReveal'
import { AiUserComment } from './AiUserComment'
import { AiGenerationView } from './AiGenerationView'
import { formatAiGenerationPreview } from '@/lib/ai/formatAiGeneration'

export interface AiGenerationHistoryProps {
  kind?: AiDataKind
  mode?: string
  contextKey?: string
  pageSize?: number
  onRestore?: (entry: AiGeneratedRecord) => void
  className?: string
  testId?: string
  /** Start expanded (e.g. on /ai-history page) */
  defaultOpen?: boolean
}

export function AiGenerationHistory({
  kind,
  mode,
  contextKey,
  pageSize = 5,
  onRestore,
  className = '',
  testId = 'ai-generation-history',
  defaultOpen = false,
}: AiGenerationHistoryProps) {
  const [items, setItems] = useState<AiGeneratedRecord[]>([])
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [open, setOpen] = useState(defaultOpen)
  const [source, setSource] = useState<'cloud' | 'local'>('local')

  const load = useCallback(
    async (append: boolean, pageCursor: { createdAt: string; id: string } | null) => {
      setLoading(true)
      setError(null)
      try {
        const page = await listAiHistoryPage({
          kind,
          mode,
          pageSize,
          cursor: append ? pageCursor : null,
          contextKey,
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
    [kind, mode, pageSize, contextKey],
  )

  useEffect(() => {
    if (!open) return
    setCursor(null)
    void load(false, null)
  }, [open, kind, mode, contextKey, load])

  return (
    <div
      className={`rounded-lg border border-slate-800/60 bg-slate-900/30 ${className}`}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] text-slate-400 hover:text-indigo-300"
        data-testid={`${testId}-toggle`}
      >
        <span>
          Prior generations ({source === 'cloud' ? 'cloud' : 'this browser'})
        </span>
        <span className="text-slate-600">{open ? 'Hide' : 'Browse'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-800/50 px-2.5 py-2">
          {error && <p className="text-[10px] text-red-400">{error}</p>}
          {loading && items.length === 0 && (
            <p className="text-[10px] text-slate-500">Loading…</p>
          )}
          {!loading && items.length === 0 && (
            <p className="text-[10px] text-slate-600">No saved generations yet for this filter.</p>
          )}
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {items.map((entry) => {
              const preview = formatAiGenerationPreview(entry, 140)
              const expanded = expandedId === entry.id
              return (
                <li
                  key={entry.id}
                  className="rounded border border-slate-800/80 bg-slate-950/50 p-2 text-[10px]"
                  data-testid={`${testId}-item`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-1">
                    <div className="min-w-0">
                      <span className="font-mono text-slate-500">{entry.mode}</span>
                      <span className="text-slate-600">
                        {' '}
                        · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        className="rounded border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400 hover:text-indigo-300"
                        onClick={() => setExpandedId(expanded ? null : entry.id)}
                      >
                        {expanded ? 'Less' : 'View'}
                      </button>
                      {onRestore && (
                        <button
                          type="button"
                          className="rounded border border-violet-800/50 px-1.5 py-0.5 text-[9px] text-violet-300 hover:bg-violet-950/40"
                          onClick={() => onRestore(entry)}
                          data-testid={`${testId}-restore`}
                        >
                          Load
                        </button>
                      )}
                    </div>
                  </div>
                  {!expanded && (
                    <p className="mt-1 text-slate-400 line-clamp-2">{preview || '(empty)'}</p>
                  )}
                  {expanded && (
                    <div className="mt-2 space-y-2">
                      <div className="max-h-48 overflow-y-auto rounded border border-slate-800/50 bg-slate-950/40 p-1.5">
                        <AiGenerationView
                          entry={entry}
                          density="full"
                          testId={`${testId}-body-${entry.id}`}
                        />
                      </div>
                      {(entry.promptSystem || entry.promptUser) && (
                        <AiPromptReveal
                          system={entry.promptSystem}
                          user={entry.promptUser}
                          mode={entry.mode}
                          testId={`${testId}-prompt-${entry.id}`}
                        />
                      )}
                      <AiUserComment
                        generationId={entry.id}
                        initialComment={entry.userComment}
                        compact
                        testId={`${testId}-comment-${entry.id}`}
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
              className="w-full rounded border border-slate-700 py-1 text-[10px] text-slate-400 hover:text-indigo-300 disabled:opacity-40"
              data-testid={`${testId}-more`}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
