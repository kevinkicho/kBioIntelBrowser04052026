'use client'

/**
 * Paginated review of prior AI generations (Firestore when signed in).
 * User can restore a past output instead of only regenerating.
 */

import { useCallback, useEffect, useState } from 'react'
import { useFirebaseAuth } from '@/lib/firebase/FirebaseProvider'
import {
  listAiGeneratedPage,
  type AiDataKind,
  type AiGeneratedRecord,
} from '@/lib/firebase/aiDataSync'
import { AiPromptReveal } from './AiPromptReveal'

export interface AiGenerationHistoryProps {
  kind?: AiDataKind
  mode?: string
  /** Optional filter: context name / packId / projectId substring */
  contextKey?: string
  pageSize?: number
  onRestore?: (entry: AiGeneratedRecord) => void
  className?: string
  testId?: string
}

export function AiGenerationHistory({
  kind,
  mode,
  contextKey,
  pageSize = 5,
  onRestore,
  className = '',
  testId = 'ai-generation-history',
}: AiGenerationHistoryProps) {
  const auth = useFirebaseAuth()
  const uid = auth.user?.uid
  const [items, setItems] = useState<AiGeneratedRecord[]>([])
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(
    async (append: boolean, pageCursor: { createdAt: string; id: string } | null) => {
      if (!uid) return
      setLoading(true)
      setError(null)
      try {
        const page = await listAiGeneratedPage(uid, {
          kind,
          mode,
          pageSize,
          cursor: append ? pageCursor : null,
        })
        let nextItems = page.items
        if (contextKey) {
          const k = contextKey.toLowerCase()
          nextItems = nextItems.filter((r) => {
            const c = r.context
            if (!c) return true
            return (
              (c.name && c.name.toLowerCase().includes(k)) ||
              (c.packId && c.packId.includes(contextKey)) ||
              (c.projectId && c.projectId.includes(contextKey)) ||
              (c.hypId && c.hypId.includes(contextKey)) ||
              String(c.cid ?? '') === contextKey
            )
          })
        }
        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems))
        setCursor(page.nextCursor)
        setHasMore(page.hasMore)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    },
    [uid, kind, mode, pageSize, contextKey],
  )

  useEffect(() => {
    if (!open || !uid) return
    setCursor(null)
    void load(false, null)
  }, [open, uid, kind, mode, contextKey, load])

  if (!uid) {
    return (
      <p className={`text-[10px] text-slate-600 ${className}`} data-testid={`${testId}-signed-out`}>
        Sign in to save and paginate AI generations in the cloud (local session still works
        without cloud).
      </p>
    )
  }

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
        <span>Prior generations (cloud)</span>
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
              const preview = (entry.content || entry.error || '').slice(0, 120)
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
                      {entry.model && (
                        <span className="text-slate-600"> · {entry.model}</span>
                      )}
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
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                  {!expanded && (
                    <p className="mt-1 text-slate-500 line-clamp-2">{preview || '(empty)'}</p>
                  )}
                  {expanded && (
                    <div className="mt-2 space-y-2">
                      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[9px] text-slate-400">
                        {entry.content || entry.error || ''}
                      </pre>
                      {(entry.promptSystem || entry.promptUser) && (
                        <AiPromptReveal
                          system={entry.promptSystem}
                          user={entry.promptUser}
                          mode={entry.mode}
                          testId={`${testId}-prompt-${entry.id}`}
                        />
                      )}
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
