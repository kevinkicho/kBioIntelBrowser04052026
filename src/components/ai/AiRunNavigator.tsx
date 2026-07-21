'use client'

/**
 * Paginated navigator for prior AI runs on a surface.
 * User re-runs many times → flip through different responses, inspect prompts, add notes.
 * Live free-API evidence only — no mock generations.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  listAiHistoryPage,
  aiKindLabel,
  type AiDataKind,
  type AiGeneratedRecord,
} from '@/lib/ai/aiHistoryStore'
import { AiPromptReveal } from './AiPromptReveal'
import { AiUserComment } from './AiUserComment'
import { AiGenerationView } from './AiGenerationView'

export interface AiRunNavigatorProps {
  kind: AiDataKind
  mode?: string
  contextKey?: string
  /** Bump after each new generation so history reloads. */
  refreshKey?: number | string
  /** Focus a specific generation id (e.g. just-saved). */
  activeId?: string | null
  onSelect?: (entry: AiGeneratedRecord) => void
  className?: string
  testId?: string
  pageSize?: number
}

export function AiRunNavigator({
  kind,
  mode,
  contextKey,
  refreshKey = 0,
  activeId = null,
  onSelect,
  className = '',
  testId = 'ai-run-navigator',
  pageSize = 12,
}: AiRunNavigatorProps) {
  const [items, setItems] = useState<AiGeneratedRecord[]>([])
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<'cloud' | 'local'>('local')
  const [error, setError] = useState<string | null>(null)
  /** Index into loaded items (0 = newest). */
  const [index, setIndex] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)

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
        setItems((prev) => {
          const next = append ? [...prev, ...page.items] : page.items
          return next
        })
        setCursor(page.nextCursor)
        setHasMore(page.hasMore)
        setSource(page.source)
        if (!append) {
          setIndex(0)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    },
    [kind, mode, pageSize, contextKey],
  )

  useEffect(() => {
    setCursor(null)
    void load(false, null)
  }, [kind, mode, contextKey, refreshKey, load])

  // Focus activeId when it appears in the list
  useEffect(() => {
    if (!activeId || items.length === 0) return
    const i = items.findIndex((r) => r.id === activeId)
    if (i >= 0) setIndex(i)
  }, [activeId, items])

  const current = items[index] ?? null
  const totalLoaded = items.length
  const displayN = totalLoaded === 0 ? 0 : index + 1

  function go(delta: number) {
    const next = Math.max(0, Math.min(totalLoaded - 1, index + delta))
    if (next === index) return
    setIndex(next)
    const entry = items[next]
    if (entry) onSelect?.(entry)
  }

  function selectCurrent() {
    if (current) onSelect?.(current)
  }

  return (
    <div
      className={`rounded-lg border border-slate-800/70 bg-slate-900/40 ${className}`}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 px-2.5 py-1.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-300">
            Saved runs · {aiKindLabel(kind)}
            {mode ? (
              <span className="ml-1 font-mono font-normal text-slate-500">{mode}</span>
            ) : null}
          </p>
          <p className="text-[9px] text-slate-600">
            {source === 'cloud' ? 'cloud + local' : 'this browser'} · live generations only ·{' '}
            <Link href="/ai-history" className="text-indigo-500 hover:underline">
              full history
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-1" data-testid={`${testId}-pager`}>
          <button
            type="button"
            disabled={loading || index <= 0}
            onClick={() => go(-1)}
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:text-indigo-300 disabled:opacity-30"
            data-testid={`${testId}-prev`}
            aria-label="Newer generation"
          >
            ◀
          </button>
          <span
            className="min-w-[4.5rem] text-center font-mono text-[10px] tabular-nums text-slate-400"
            data-testid={`${testId}-position`}
          >
            {loading && totalLoaded === 0
              ? '…'
              : totalLoaded === 0
                ? '0 / 0'
                : `${displayN} / ${totalLoaded}${hasMore ? '+' : ''}`}
          </span>
          <button
            type="button"
            disabled={loading || index >= totalLoaded - 1}
            onClick={() => go(1)}
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:text-indigo-300 disabled:opacity-30"
            data-testid={`${testId}-next`}
            aria-label="Older generation"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="space-y-2 px-2.5 py-2">
        {error && <p className="text-[10px] text-red-400">{error}</p>}
        {!loading && totalLoaded === 0 && (
          <p className="text-[10px] text-slate-600">
            No saved runs yet. Generate once — each re-run is recorded so you can compare
            responses.
          </p>
        )}
        {current && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500">
                  {current.createdAt
                    ? new Date(current.createdAt).toLocaleString()
                    : '—'}
                  {current.model ? ` · ${current.model}` : ''}
                  {current.error ? ' · error' : ''}
                </p>
                {current.userComment?.trim() && (
                  <p className="mt-1 text-[10px] text-amber-200/80 line-clamp-2">
                    Note: {current.userComment.trim()}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {onSelect && (
                  <button
                    type="button"
                    onClick={selectCurrent}
                    className="rounded border border-emerald-800/50 px-2 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-950/40"
                    data-testid={`${testId}-load`}
                  >
                    Load this run
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPrompt((v) => !v)}
                  className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-indigo-300"
                  data-testid={`${testId}-toggle-prompt`}
                >
                  {showPrompt ? 'Hide prompt' : 'Show prompt'}
                </button>
              </div>
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto rounded border border-slate-800/60 bg-slate-950/40 p-2">
              <AiGenerationView
                entry={current}
                density="full"
                testId={`${testId}-body`}
              />
            </div>
            {showPrompt && (
              <AiPromptReveal
                system={current.promptSystem}
                user={current.promptUser}
                mode={current.mode}
                testId={`${testId}-prompt`}
              />
            )}
            <AiUserComment
              generationId={current.id}
              initialComment={current.userComment}
              compact
              testId={`${testId}-comment`}
              onSaved={(comment) => {
                setItems((prev) =>
                  prev.map((r) =>
                    r.id === current.id
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
          </>
        )}
        {hasMore && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(true, cursor)}
            className="w-full rounded border border-slate-700 py-1 text-[10px] text-slate-400 hover:text-indigo-300 disabled:opacity-40"
            data-testid={`${testId}-more`}
          >
            {loading ? 'Loading…' : 'Load older runs'}
          </button>
        )}
      </div>
    </div>
  )
}
