'use client'

import { useEffect, useRef, useState } from 'react'
import type { ScoreRubric, ScoreVector } from '@/lib/domain'
import { createDefaultScoreRubric } from '@/lib/domain/score'
import { AXIS_LABELS, AXIS_ORDER } from '@/lib/profileMode'
import {
  AXIS_HELP,
  axisStatusHelp,
  explainScoreContributions,
  formatCompositeTooltip,
} from '@/lib/domain/scoreAxisHelp'
import { emitProductEvent } from '@/lib/productEvents'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

export interface ScoreExplainerProps {
  rubric?: ScoreRubric
  scores?: ScoreVector
  /** Compact icon-only trigger (default true) */
  compact?: boolean
  className?: string
}

/**
 * Polished multi-axis score breakdown popover.
 * Shows weights, live axis values, contribution shares, and investigation disclaimer.
 */
export function ScoreExplainer({
  rubric,
  scores,
  compact = true,
  className = '',
}: ScoreExplainerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const weights =
    rubric?.weights ?? scores?.weights ?? createDefaultScoreRubric('balanced').weights
  const preset = rubric?.preset ?? scores?.rubricId ?? 'balanced'
  const expl = scores
    ? explainScoreContributions(
        scores,
        rubric ?? createDefaultScoreRubric('balanced', { weights }),
      )
    : null

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`relative inline-block ${className}`} ref={rootRef}>
      <button
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) {
            emitProductEvent('score_breakdown_opened', { preset: String(preset) })
          }
        }}
        className="text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
        aria-label={
          scores
            ? `How is this score calculated? ${formatCompositeTooltip(scores, rubric).slice(0, 120)}`
            : 'How multi-axis scoring works'
        }
        aria-expanded={open}
        type="button"
        data-testid="score-explainer-toggle"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {!compact && (
          <span className="text-[10px] text-slate-400">How scoring works</span>
        )}
      </button>
      {open && (
        <div
          className="absolute z-50 left-0 top-5 w-80 max-w-[min(20rem,calc(100vw-2rem))] bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-xs text-slate-300 leading-relaxed"
          data-testid="score-explainer-panel"
          role="dialog"
          aria-label="Score breakdown"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-200">Multi-axis composite</span>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-300 text-sm leading-none"
              type="button"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <p className="mb-2 text-[11px]">
            Weighted sum over five axes (preset:{' '}
            <span className="text-slate-200">{String(preset)}</span>
            ). Missing axes are renormalized or penalized per rubric — never invented by AI.
          </p>
          {expl && (
            <p
              className="mb-2 rounded border border-slate-700/80 bg-slate-900/50 px-2 py-1 text-[11px] text-emerald-300/90 tabular-nums"
              data-testid="score-explainer-composite"
            >
              Composite {Math.round(expl.composite * 100)}%
              {scores?.scorePhase ? ` · ${scores.scorePhase}` : ''}
            </p>
          )}
          <div className="space-y-1.5 mb-2" data-testid="score-explainer-axes">
            {AXIS_ORDER.map((key) => {
              const help = AXIS_HELP[key]
              const row = expl?.axes.find((a) => a.key === key)
              const w = Math.round((row?.weight ?? weights[key] ?? 0) * 100)
              const val =
                row?.value == null
                  ? scores
                    ? '—'
                    : null
                  : `${Math.round(row.value * 100)}%`
              const share =
                row?.shareOfComposite != null
                  ? `${Math.round(row.shareOfComposite * 100)}%`
                  : row && !row.included
                    ? 'excl.'
                    : null
              return (
                <StyledTooltip
                  key={key}
                  content={`${help.summary}\nSources: ${help.sources}`}
                  className="w-full"
                >
                  <div
                    className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 w-full"
                    data-testid={`score-explainer-axis-${key}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-indigo-400 font-medium">{AXIS_LABELS[key]}</span>
                      <span className="text-slate-400 tabular-nums shrink-0">
                        {val != null && <span className="text-slate-200">{val}</span>}
                        <span className="text-slate-600"> · {w}% wt</span>
                        {share != null && (
                          <span className="text-slate-500"> · {share}</span>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500 leading-snug">{help.summary}</p>
                    {scores && (
                      <p className="mt-0.5 text-[9px] text-slate-600">
                        {axisStatusHelp(scores.axisStatus[key])}
                      </p>
                    )}
                  </div>
                </StyledTooltip>
              )
            })}
          </div>
          {expl && (
            <p className="mb-2 text-[10px] text-slate-500" data-testid="score-explainer-policy">
              {expl.policy}
            </p>
          )}
          <p className="text-[10px] text-slate-500 border-t border-slate-700/80 pt-2">
            Investigation priority only — not a prediction of clinical success. Empty safety ≠ safe.
            Soft AE flags may appear as badges without hard-penalizing unless the rubric is set to
            hard penalty.
          </p>
        </div>
      )}
    </div>
  )
}
