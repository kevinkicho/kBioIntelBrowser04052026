'use client'

/**
 * User research notes on a saved AI generation.
 * Dual-writes via aiHistoryStore (local IDB + cloud when signed in).
 * Never model-authored — researcher-owned annotation only.
 */

import { useEffect, useState } from 'react'
import { updateAiGenerationComment } from '@/lib/ai/aiHistoryStore'

export interface AiUserCommentProps {
  generationId: string | null | undefined
  initialComment?: string | null
  onSaved?: (comment: string) => void
  className?: string
  testId?: string
  compact?: boolean
}

export function AiUserComment({
  generationId,
  initialComment = '',
  onSaved,
  className = '',
  testId = 'ai-user-comment',
  compact = false,
}: AiUserCommentProps) {
  const [draft, setDraft] = useState(initialComment || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(initialComment || '')
    setStatus(null)
    setError(null)
  }, [generationId, initialComment])

  if (!generationId) {
    return (
      <p className={`text-[10px] text-slate-600 ${className}`} data-testid={`${testId}-disabled`}>
        Run AI once to attach research notes to a saved generation.
      </p>
    )
  }

  const dirty = draft.trim() !== (initialComment || '').trim()

  async function save() {
    if (!generationId) return
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      const r = await updateAiGenerationComment(generationId, draft)
      if (!r.ok) {
        setError(r.message || 'Save failed')
        return
      }
      setStatus(r.message || 'Saved')
      onSaved?.(draft.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`rounded-lg border border-slate-800/80 bg-slate-950/50 ${className}`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-2 px-2.5 pt-2">
        <label htmlFor={`${testId}-input`} className="text-[10px] font-medium text-slate-400">
          Your research notes
        </label>
        {status && <span className="text-[9px] text-emerald-500/90">{status}</span>}
      </div>
      <p className="px-2.5 text-[9px] text-slate-600 leading-relaxed">
        Private notes on this run — not of-record, not model-generated. Helps when comparing
        multiple regenerations.
      </p>
      <textarea
        id={`${testId}-input`}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setStatus(null)
        }}
        rows={compact ? 2 : 3}
        placeholder="e.g. Prefer later-phase candidates; check safety panel before board…"
        className="mx-2.5 mt-1.5 mb-1 w-[calc(100%-1.25rem)] resize-y rounded border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none"
        data-testid={`${testId}-input`}
      />
      <div className="flex flex-wrap items-center gap-2 px-2.5 pb-2">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() => void save()}
          className="rounded border border-indigo-700/60 bg-indigo-950/40 px-2 py-1 text-[10px] text-indigo-200 hover:bg-indigo-900/40 disabled:opacity-40"
          data-testid={`${testId}-save`}
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
        {dirty && <span className="text-[9px] text-amber-500/80">Unsaved</span>}
        {error && (
          <span className="text-[9px] text-red-400" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
