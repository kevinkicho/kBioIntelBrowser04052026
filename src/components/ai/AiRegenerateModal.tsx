'use client'

/**
 * Regenerate modal at the generation surface:
 * - Review system + user prompts
 * - Override user prompt (and optionally system)
 * - Paginated prior generations with Restore
 * - Confirm regenerate with chosen prompt
 */

import { useCallback, useEffect, useState } from 'react'
import {
  listAiHistoryPage,
  aiKindLabel,
  type AiDataKind,
  type AiGeneratedRecord,
} from '@/lib/ai/aiHistoryStore'
import { humanModeLabel } from '@/lib/ai/aiUiCopy'
import { AiUserComment } from './AiUserComment'
import { AiGenerationView } from './AiGenerationView'
import { formatAiGenerationPreview } from '@/lib/ai/formatAiGeneration'

export interface AiRegenerateModalProps {
  open: boolean
  onClose: () => void
  kind: AiDataKind
  mode: string
  title?: string
  systemPrompt: string
  userPrompt: string
  contextKey?: string
  busy?: boolean
  /** Allow editing system prompt (default false — safer for structured modes) */
  allowOverrideSystem?: boolean
  onRegenerate: (opts: {
    system: string
    user: string
    userOverrode: boolean
  }) => void | Promise<void>
  onLoadEntry: (entry: AiGeneratedRecord) => void
  testId?: string
}

export function AiRegenerateModal({
  open,
  onClose,
  kind,
  mode,
  title = 'Regenerate with prompt review',
  systemPrompt,
  userPrompt,
  contextKey,
  busy = false,
  allowOverrideSystem = false,
  onRegenerate,
  onLoadEntry,
  testId = 'ai-regenerate-modal',
}: AiRegenerateModalProps) {
  const [systemDraft, setSystemDraft] = useState(systemPrompt)
  const [userDraft, setUserDraft] = useState(userPrompt)
  const [items, setItems] = useState<AiGeneratedRecord[]>([])
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingHist, setLoadingHist] = useState(false)
  const [source, setSource] = useState<'cloud' | 'local'>('local')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [histError, setHistError] = useState<string | null>(null)

  // Reset drafts when opening or base prompts change
  useEffect(() => {
    if (!open) return
    setSystemDraft(systemPrompt)
    setUserDraft(userPrompt)
  }, [open, systemPrompt, userPrompt])

  const loadHistory = useCallback(
    async (append: boolean, pageCursor: { createdAt: string; id: string } | null) => {
      setLoadingHist(true)
      setHistError(null)
      try {
        const page = await listAiHistoryPage({
          kind,
          mode,
          pageSize: 6,
          cursor: append ? pageCursor : null,
          contextKey,
        })
        setItems((prev) => (append ? [...prev, ...page.items] : page.items))
        setCursor(page.nextCursor)
        setHasMore(page.hasMore)
        setSource(page.source)
      } catch (e) {
        setHistError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoadingHist(false)
      }
    },
    [kind, mode, contextKey],
  )

  useEffect(() => {
    if (!open) return
    setCursor(null)
    void loadHistory(false, null)
  }, [open, kind, mode, contextKey, loadHistory])

  if (!open) return null

  const userOverrode =
    userDraft.trim() !== (userPrompt || '').trim() ||
    (allowOverrideSystem && systemDraft.trim() !== (systemPrompt || '').trim())

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${testId}-title`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm border-0 cursor-default"
        aria-label="Close regenerate modal"
        onClick={() => !busy && onClose()}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="min-w-0">
            <h2 id={`${testId}-title`} className="text-sm font-semibold text-slate-100">
              {title}
            </h2>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
              {aiKindLabel(kind)} · {humanModeLabel(mode) || mode}. Edit the prompt the model will
              see, restore a past answer into the panel, then generate again. Not of-record for
              Discover ranks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
            data-testid={`${testId}-close`}
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
          {/* Prompt editor */}
          <div className="min-h-0 space-y-2 overflow-y-auto border-b border-slate-800 p-4 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              What will be sent to the model
            </p>
            <p className="text-[9px] leading-snug text-slate-600">
              Left column = next run. Right column = past runs you can restore or copy into the
              editor.
            </p>
            <label className="block text-[10px] text-slate-400">
              System rules{allowOverrideSystem ? ' (editable)' : ' (read-only for this mode)'}
            </label>
            <textarea
              value={systemDraft}
              onChange={(e) => allowOverrideSystem && setSystemDraft(e.target.value)}
              readOnly={!allowOverrideSystem}
              rows={6}
              className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-[10px] text-slate-300 ${
                allowOverrideSystem ? '' : 'opacity-80'
              }`}
              data-testid={`${testId}-system`}
            />
            <label className="block text-[10px] text-slate-400">
              User context / question (edit freely before regenerate)
            </label>
            <textarea
              value={userDraft}
              onChange={(e) => setUserDraft(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-indigo-900/40 bg-slate-950 px-2 py-1.5 font-mono text-[10px] text-slate-200 focus:border-indigo-600 focus:outline-none"
              data-testid={`${testId}-user`}
            />
            {userOverrode && (
              <p className="text-[10px] text-amber-400/90">
                Prompt overridden — regenerate will use your edits.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={busy || !userDraft.trim()}
                onClick={() =>
                  void onRegenerate({
                    system: systemDraft,
                    user: userDraft,
                    userOverrode,
                  })
                }
                className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-40"
                data-testid={`${testId}-run`}
              >
                {busy ? 'Generating…' : 'Regenerate with this prompt'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSystemDraft(systemPrompt)
                  setUserDraft(userPrompt)
                }}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                data-testid={`${testId}-reset`}
              >
                Reset to original
              </button>
            </div>
          </div>

          {/* Paginated history */}
          <div className="flex min-h-0 flex-col overflow-hidden p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Past results
              </p>
              <span className="text-[9px] text-slate-600">
                {source === 'cloud' ? 'cloud' : 'this browser'}
              </span>
            </div>
            {histError && <p className="text-[10px] text-red-400 mb-1">{histError}</p>}
            {loadingHist && items.length === 0 && (
              <p className="text-[10px] text-slate-500">Loading past results…</p>
            )}
            {!loadingHist && items.length === 0 && (
              <p className="text-[10px] text-slate-600">
                No past results for this mode yet. Generate once to start a history you can restore.
              </p>
            )}
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {items.map((entry) => {
                const expanded = expandedId === entry.id
                const preview = formatAiGenerationPreview(entry, 120)
                return (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-[10px]"
                    data-testid={`${testId}-hist-item`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-1">
                      <div className="min-w-0 text-slate-500">
                        <span>{humanModeLabel(entry.mode) || entry.mode}</span>
                        <span>
                          {' '}
                          ·{' '}
                          {entry.createdAt
                            ? new Date(entry.createdAt).toLocaleString()
                            : '—'}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          className="rounded border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400 hover:text-indigo-300"
                          onClick={() => setExpandedId(expanded ? null : entry.id)}
                        >
                          {expanded ? 'Less' : 'Preview'}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-emerald-800/50 px-1.5 py-0.5 text-[9px] text-emerald-300 hover:bg-emerald-950/40"
                          data-testid={`${testId}-load`}
                          onClick={() => {
                            onLoadEntry(entry)
                            // Prefill editor with stored prompts if present
                            if (entry.promptSystem) setSystemDraft(entry.promptSystem)
                            if (entry.promptUser) setUserDraft(entry.promptUser)
                          }}
                        >
                          Restore into panel
                        </button>
                      </div>
                    </div>
                    {!expanded && (
                      <p className="mt-1 text-slate-400 line-clamp-2">{preview || '(empty)'}</p>
                    )}
                    {expanded && (
                      <div className="mt-2 space-y-1">
                        <div className="max-h-40 overflow-y-auto rounded border border-slate-800/50 bg-slate-950/50 p-1.5">
                          <AiGenerationView
                            entry={entry}
                            density="full"
                            testId={`${testId}-body-${entry.id}`}
                          />
                        </div>
                        {(entry.promptUser || entry.promptSystem) && (
                          <button
                            type="button"
                            className="text-[9px] text-indigo-400 hover:text-indigo-300"
                            onClick={() => {
                              if (entry.promptSystem) setSystemDraft(entry.promptSystem)
                              if (entry.promptUser) setUserDraft(entry.promptUser)
                            }}
                          >
                            Copy prompts into editor
                          </button>
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
                disabled={loadingHist}
                onClick={() => void loadHistory(true, cursor)}
                className="mt-2 w-full rounded border border-slate-700 py-1.5 text-[10px] text-slate-400 hover:text-indigo-300 disabled:opacity-40"
                data-testid={`${testId}-more`}
              >
                {loadingHist ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
