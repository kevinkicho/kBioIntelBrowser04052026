'use client'

/**
 * Paginated navigator for prior AI runs on a surface.
 * Compact actions: Load · Prompt (styled tooltips, opacity 0.3) — no “Show prompt” noise.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [loadFlash, setLoadFlash] = useState(false)
  const [loadMsg, setLoadMsg] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const fetchPage = useCallback(
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
    void fetchPage(false, null)
  }, [kind, mode, contextKey, refreshKey, fetchPage])

  // Focus activeId when it appears in the list
  useEffect(() => {
    if (!activeId || items.length === 0) return
    const i = items.findIndex((r) => r.id === activeId)
    if (i >= 0) setIndex(i)
  }, [activeId, items])

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  const current = items[index] ?? null
  const totalLoaded = items.length
  const displayN = totalLoaded === 0 ? 0 : index + 1
  const hasPrompt = Boolean(current?.promptSystem || current?.promptUser)
  const canLoad = Boolean(onSelect && current)

  function applyLoad(entry: AiGeneratedRecord, opts?: { silent?: boolean }) {
    if (!onSelectRef.current) {
      if (!opts?.silent) {
        setLoadMsg('No load handler on this surface')
        setLoadFlash(true)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => {
          setLoadFlash(false)
          setLoadMsg(null)
        }, 1600)
      }
      return
    }
    try {
      onSelectRef.current(entry)
      if (!opts?.silent) {
        setLoadMsg('Loaded')
        setLoadFlash(true)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => {
          setLoadFlash(false)
          setLoadMsg(null)
        }, 1200)
      }
    } catch (e) {
      setLoadMsg(e instanceof Error ? e.message : 'Load failed')
      setLoadFlash(true)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => {
        setLoadFlash(false)
        setLoadMsg(null)
      }, 2000)
    }
  }

  function go(delta: number) {
    const next = Math.max(0, Math.min(totalLoaded - 1, index + delta))
    if (next === index) return
    setIndex(next)
    const entry = items[next]
    // Preview only — explicit Load applies into the main panel (avoids surprise overwrite)
    void entry
  }

  function selectCurrent() {
    if (!current) return
    applyLoad(current)
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
            {source === 'cloud' ? 'cloud + local' : 'this browser'} ·{' '}
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
          <p className="text-[10px] text-slate-600 opacity-30">
            No saved runs yet. Generate once — each re-run is recorded so you can compare
            responses.
          </p>
        )}
        {current && (
          <>
            {/* Single compact action row: meta | Load · Prompt */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="min-w-0 flex-1 text-[10px] text-slate-500">
                {current.createdAt
                  ? new Date(current.createdAt).toLocaleString()
                  : '—'}
                {current.model ? ` · ${current.model}` : ''}
                {current.error ? ' · error' : ''}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={!canLoad}
                  onClick={selectCurrent}
                  className={`rounded border px-1.5 py-0.5 text-[10px] transition-opacity focus:outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-30 ${
                    loadFlash
                      ? 'border-emerald-600/60 bg-emerald-950/40 text-emerald-200 opacity-100'
                      : 'border-emerald-800/40 text-emerald-300/90 opacity-30 hover:opacity-100 hover:bg-emerald-950/30'
                  }`}
                  data-testid={`${testId}-load`}
                >
                  {loadFlash && loadMsg ? loadMsg : 'Load'}
                </button>
                {hasPrompt ? (
                  <AiPromptReveal
                    system={current.promptSystem}
                    user={current.promptUser}
                    mode={current.mode}
                    align="right"
                    testId={`${testId}-prompt`}
                  />
                ) : (
                  <span
                    className="rounded border border-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 opacity-30"
                    data-testid={`${testId}-prompt-empty`}
                  >
                    Prompt
                  </span>
                )}
              </div>
            </div>
            {current.userComment?.trim() && (
              <p className="text-[10px] text-amber-200/80 line-clamp-2">
                Note: {current.userComment.trim()}
              </p>
            )}
            <div className="max-h-48 overflow-y-auto rounded border border-slate-800/60 bg-slate-950/40 p-2">
              <AiGenerationView
                entry={current}
                density="full"
                testId={`${testId}-body`}
              />
            </div>
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
            onClick={() => void fetchPage(true, cursor)}
            className="w-full rounded border border-slate-700 py-1 text-[10px] text-slate-400 opacity-30 hover:opacity-100 hover:text-indigo-300 disabled:opacity-30"
            data-testid={`${testId}-more`}
          >
            {loading ? 'Loading…' : 'Older'}
          </button>
        )}
      </div>
    </div>
  )
}
