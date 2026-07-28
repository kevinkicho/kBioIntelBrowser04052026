'use client'

import { useEffect, useRef, useState } from 'react'
import type { ScoreRubric, ScoreVector } from '@/lib/domain'
import { createDefaultScoreRubric } from '@/lib/domain/score'
import { AXIS_LABELS, AXIS_ORDER } from '@/lib/profileMode'
import {
  AXIS_HELP,
  AXIS_MATH,
  COMPOSITE_MATH,
  explainScoreContributions,
  formatCompositeTooltip,
} from '@/lib/domain/scoreAxisHelp'
import { emitProductEvent } from '@/lib/productEvents'
import { HelperTip } from '@/components/ui/HelperTip'
import { ScoreMathTooltip } from '@/components/score/ScoreMathTooltip'
import { PortaledTooltipPanel } from '@/components/ui/PortaledTooltipPanel'

export interface ScoreExplainerProps {
  rubric?: ScoreRubric
  scores?: ScoreVector
  /** Compact icon-only trigger (default true) */
  compact?: boolean
  className?: string
}

/**
 * Polished multi-axis score breakdown popover.
 * Body-portaled so it never paints under page-canvas.
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
      const t = e.target as Node | null
      if (!t) return
      if (rootRef.current?.contains(t)) return
      if ((t as Element).closest?.('[data-testid="score-explainer-panel"]')) return
      setOpen(false)
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
      <PortaledTooltipPanel
        open={open}
        anchorRef={rootRef}
        side="bottom"
        align="left"
        maxWidth="20rem"
        interactive
        testId="score-explainer-panel"
        className="!w-80 !max-w-[min(20rem,calc(100vw-2rem))] !bg-slate-800 !border-slate-700 !p-3 !text-xs !leading-relaxed"
      >
        <div
          role="dialog"
          aria-label="Score breakdown"
          className="text-slate-300"
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
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            <span>
              Preset: <span className="text-slate-200">{String(preset)}</span>
            </span>
            <HelperTip
              content={`${COMPOSITE_MATH.formula}\n\n${COMPOSITE_MATH.steps.join('\n')}\n\n${COMPOSITE_MATH.science}`}
              label="About multi-axis composite math"
              testId="score-explainer-method-help"
              maxWidth="22rem"
            />
          </div>
          {expl && (
            <ScoreMathTooltip composite scores={scores} rubric={rubric} testId="score-explainer-composite-math">
              <p
                className="mb-2 rounded border border-slate-700/80 bg-slate-900/50 px-2 py-1 text-[11px] text-emerald-300/90 tabular-nums cursor-help"
                data-testid="score-explainer-composite"
              >
                Composite {Math.round(expl.composite * 100)}%
                {scores?.scorePhase ? ` · ${scores.scorePhase}` : ''}
              </p>
            </ScoreMathTooltip>
          )}
          <div className="space-y-1.5 mb-2" data-testid="score-explainer-axes">
            {AXIS_ORDER.map((key) => {
              const math = AXIS_MATH[key]
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
                <ScoreMathTooltip
                  key={key}
                  axis={key}
                  scores={scores}
                  rubric={rubric}
                  className="w-full"
                  testId={`score-explainer-axis-math-${key}`}
                >
                  <div
                    className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 w-full cursor-help"
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
                    <p className="mt-0.5 font-mono text-[8px] text-slate-600 truncate">
                      {math.formula}
                    </p>
                  </div>
                </ScoreMathTooltip>
              )
            })}
          </div>
          {expl && (
            <span className="sr-only" data-testid="score-explainer-policy">
              {expl.policy}
            </span>
          )}
          <div className="flex items-center gap-1.5 border-t border-slate-700/80 pt-2 text-[10px] text-slate-500">
            <span>Investigation priority only</span>
            <HelperTip
              content={[
                expl?.policy,
                COMPOSITE_MATH.disclaimer,
                ...AXIS_ORDER.map((key) => {
                  const h = AXIS_HELP[key]
                  const m = AXIS_MATH[key]
                  return h ? `${AXIS_LABELS[key]}: ${m.formula}\n${h.summary}` : ''
                }),
              ]
                .filter(Boolean)
                .join('\n\n')}
              label="About score axes math"
              testId="score-explainer-disclaimer-help"
              maxWidth="22rem"
            />
          </div>
        </div>
      </PortaledTooltipPanel>
    </div>
  )
}
