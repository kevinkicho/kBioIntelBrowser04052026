'use client'

/**
 * Paginated navigator for prior AI runs on a surface.
 * First-look: “Past results” + Load restores the answer above; Prompt shows what was sent.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  listAiHistoryPage,
  aiKindLabel,
  type AiDataKind,
  type AiGeneratedRecord,
} from '@/lib/ai/aiHistoryStore'
import { humanModeLabel } from '@/lib/ai/aiUiCopy'
import { AiPromptReveal } from './AiPromptReveal'
import { AiUserComment } from './AiUserComment'
import { AiGenerationView } from './AiGenerationView'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

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
  const modeHuman = humanModeLabel(mode)

  function applyLoad(entry: AiGeneratedRecord, opts?: { silent?: boolean }) {
    if (!onSelectRef.current) {
      if (!opts?.silent) {
        setLoadMsg('Cannot restore here')
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
        setLoadMsg('Restored above')
        setLoadFlash(true)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => {
          setLoadFlash(false)
          setLoadMsg(null)
        }, 1200)
      }
    } catch (e) {
      setLoadMsg(e instanceof Error ? e.message : 'Restore failed')
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
          <p className="text-[10px] font-semibold text-slate-200">
            Past results
            <span className="ml-1 font-normal text-slate-500">
              · {aiKindLabel(kind)}
              {modeHuman ? ` · ${modeHuman}` : ''}
            </span>
          </p>
          <p className="text-[9px] leading-snug text-slate-600">
            Browse prior outputs. <strong className="font-medium text-slate-500">Restore</strong>{' '}
            puts the answer in the panel above ·{' '}
            <strong className="font-medium text-slate-500">Prompt</strong> shows what the model
            saw · stored in {source === 'cloud' ? 'cloud + this browser' : 'this browser'} ·{' '}
            <Link href="/ai-history" className="text-indigo-500 hover:underline">
              all history
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-1" data-testid={`${testId}-pager`}>
          <StyledTooltip content="Newer result">
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
          </StyledTooltip>
          <span
            className="min-w-[4.5rem] text-center font-mono text-[10px] tabular-nums text-slate-400"
            data-testid={`${testId}-position`}
          >
            {loading && totalLoaded === 0
              ? '…'
              : totalLoaded === 0
                ? '0 of 0'
                : `${displayN} of ${totalLoaded}${hasMore ? '+' : ''}`}
          </span>
          <StyledTooltip content="Older result">
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
          </StyledTooltip>
        </div>
      </div>

      <div className="space-y-2 px-2.5 py-2">
        {error && <p className="text-[10px] text-red-400">{error}</p>}
        {!loading && totalLoaded === 0 && (
          <p className="text-[10px] leading-relaxed text-slate-500">
            No results yet for this mode. Generate above — each run is saved here so you can
            compare answers without losing earlier ones.
          </p>
        )}
        {current && (
          <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="min-w-0 flex-1 text-[10px] text-slate-500">
                {current.createdAt
                  ? new Date(current.createdAt).toLocaleString()
                  : '—'}
                {current.model ? ` · ${current.model}` : ''}
                {current.error ? ' · failed' : ''}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <StyledTooltip
                  content={
                    canLoad
                      ? 'Put this answer into the main result area above'
                      : 'This surface cannot restore into the panel'
                  }
                >
                  <button
                    type="button"
                    disabled={!canLoad}
                    onClick={selectCurrent}
                    className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-40 ${
                      loadFlash
                        ? 'border-emerald-600/60 bg-emerald-950/40 text-emerald-200 opacity-100'
                        : 'border-emerald-700/50 bg-emerald-950/20 text-emerald-200/90 opacity-80 hover:opacity-100 hover:bg-emerald-950/40'
                    }`}
                    data-testid={`${testId}-load`}
                  >
                    {loadFlash && loadMsg ? loadMsg : 'Restore'}
                  </button>
                </StyledTooltip>
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
                    className="rounded border border-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 opacity-40"
                    data-testid={`${testId}-prompt-empty`}
                  >
                    Prompt
                  </span>
                )}
              </div>
            </div>
            {current.userComment?.trim() && (
              <p className="text-[10px] text-amber-200/80 line-clamp-2">
                Your note: {current.userComment.trim()}
              </p>
            )}
            <div className="max-h-48 overflow-y-auto rounded border border-slate-800/60 bg-slate-950/40 p-2">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                Preview of this run
              </p>
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
            className="w-full rounded border border-slate-700 py-1 text-[10px] text-slate-400 hover:text-indigo-300 disabled:opacity-30"
            data-testid={`${testId}-more`}
          >
            {loading ? 'Loading…' : 'Load older results'}
          </button>
        )}
      </div>
    </div>
  )
}
