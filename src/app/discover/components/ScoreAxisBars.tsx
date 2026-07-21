'use client'

import { useState } from 'react'
import type { AxisStatus, ScoreAxisKey, ScoreRubric, ScoreVector } from '@/lib/domain'
import { AXIS_LABELS, AXIS_ORDER } from '@/lib/profileMode'
import {
  AXIS_HELP,
  axisStatusHelp,
  formatAxisTooltip,
  formatCompositeTooltip,
} from '@/lib/domain/scoreAxisHelp'
import { ScoreExplainer } from '@/components/score/ScoreExplainer'

export interface ScoreAxisBarsProps {
  scores: ScoreVector
  rubric?: ScoreRubric
  compact?: boolean
  onOpenBreakdown?: () => void
  /** Show inline ? explainer next to footnote (default true when not compact) */
  showExplainer?: boolean
}

function axisBarColor(key: ScoreAxisKey): string {
  switch (key) {
    case 'efficacy':
      return 'bg-indigo-500'
    case 'clinicalStage':
      return 'bg-blue-500'
    case 'safety':
      return 'bg-emerald-500'
    case 'novelty':
      return 'bg-amber-500'
    case 'identityTrust':
      return 'bg-cyan-500'
    default:
      return 'bg-slate-500'
  }
}

function axisPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Math.round(value * 100)}%`
}

/** Human label for epistemic / missing axis status (never paint null as 0). */
function epistemicLabel(status: AxisStatus | undefined): string {
  switch (status) {
    case 'empty':
      return 'empty'
    case 'error':
      return 'error'
    case 'timeout':
      return 'timeout'
    case 'disabled':
      return 'disabled'
    case 'not-retrieved':
    default:
      return 'not-retrieved'
  }
}

function EpistemicChip({
  status,
  tip,
  useNativeTitle,
}: {
  status: AxisStatus | undefined
  tip: string
  /** Only when no custom flyout is used (compact boards) */
  useNativeTitle?: boolean
}) {
  const label = epistemicLabel(status)
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded border border-slate-600/60 bg-slate-800/60 text-slate-500 font-medium whitespace-nowrap cursor-help"
      data-testid="score-axis-epistemic"
      data-status={label}
      title={useNativeTitle ? tip : undefined}
    >
      {label}
    </span>
  )
}

/**
 * Multi-axis ScoreVector bars using shared AXIS_ORDER.
 * Null axes render an epistemic chip — never a zero bar.
 * Non-compact: styled flyout only (no native title — avoids double tooltips).
 * Compact: single native title on the row (board density).
 */
export function ScoreAxisBars({
  scores,
  rubric,
  compact = false,
  onOpenBreakdown,
  showExplainer,
}: ScoreAxisBarsProps) {
  const weights = rubric?.weights ?? scores.weights
  const labelWidth = compact ? 'w-[72px]' : 'w-24'
  const explainerOn = showExplainer ?? !compact
  const [hoverKey, setHoverKey] = useState<ScoreAxisKey | null>(null)
  /** Native browser title only in compact mode (no flyout). */
  const nativeTips = compact

  return (
    <div
      className={compact ? 'space-y-1' : 'space-y-1.5'}
      data-testid="score-axis-bars"
      data-score-phase={scores.scorePhase}
    >
      {!compact && (
        <div className="flex items-start gap-1.5 mb-0.5">
          <p
            className="text-[9px] leading-snug text-slate-600 flex-1"
            data-testid="score-trust-footnote"
          >
            Investigation priority only — not a prediction of clinical success. Empty safety ≠ safe.
            Composite{' '}
            <span className="text-slate-400 tabular-nums">
              {Math.round(scores.composite * 100)}%
            </span>
            {onOpenBreakdown ? (
              <>
                {' '}
                <button
                  type="button"
                  onClick={onOpenBreakdown}
                  className="text-indigo-400/90 hover:text-indigo-300 underline-offset-2 hover:underline"
                >
                  How scoring works
                </button>
              </>
            ) : null}
          </p>
          {explainerOn && (
            <ScoreExplainer rubric={rubric} scores={scores} compact />
          )}
        </div>
      )}
      {compact && explainerOn && (
        <div className="flex justify-end -mt-0.5 mb-0.5">
          <ScoreExplainer rubric={rubric} scores={scores} compact />
        </div>
      )}
      {AXIS_ORDER.map((key) => {
        const v = scores.axes[key]
        const status = scores.axisStatus[key]
        const missing = v == null
        const weightPct =
          weights && typeof weights[key] === 'number'
            ? Math.round(weights[key] * 100)
            : null
        const tip = formatAxisTooltip(key, scores, rubric)
        const help = AXIS_HELP[key]
        const showFlyout = hoverKey === key && !compact
        const rowTip = nativeTips ? tip : undefined

        return (
          <div
            key={key}
            className="relative flex items-center gap-2"
            data-testid={`score-axis-row-${key}`}
            data-axis={key}
            data-missing={missing ? 'true' : 'false'}
            title={rowTip}
            onMouseEnter={() => setHoverKey(key)}
            onMouseLeave={() => setHoverKey(null)}
            onFocus={() => setHoverKey(key)}
            onBlur={() => setHoverKey(null)}
          >
            <span
              className={`text-[10px] text-slate-500 ${labelWidth} shrink-0 truncate ${
                !nativeTips ? 'cursor-help' : ''
              }`}
            >
              {AXIS_LABELS[key]}
              {weightPct != null && !compact && (
                <span className="ml-0.5 text-[8px] text-slate-600 tabular-nums">{weightPct}%</span>
              )}
            </span>
            {missing ? (
              <div className="flex-1 flex items-center min-h-[6px]">
                {/* No chip-level title — row already owns the single native tip in compact mode */}
                <EpistemicChip
                  status={status}
                  tip={`${tip}\n${axisStatusHelp(status)}`}
                  useNativeTitle={false}
                />
              </div>
            ) : (
              <div
                className={`flex-1 bg-slate-700/50 rounded-full h-1.5 overflow-hidden ${
                  !nativeTips ? 'cursor-help' : ''
                }`}
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${axisBarColor(key)}`}
                  style={{ width: `${Math.round((v as number) * 100)}%` }}
                />
              </div>
            )}
            <span
              className={`text-[10px] w-8 text-right tabular-nums shrink-0 ${
                missing ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {axisPct(v)}
            </span>
            {showFlyout && (
              <div
                className="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl text-[10px] text-slate-300 leading-snug pointer-events-none"
                data-testid={`score-axis-flyout-${key}`}
                role="tooltip"
              >
                <div className="font-semibold text-slate-100 mb-0.5">
                  {AXIS_LABELS[key]}
                  {weightPct != null ? ` · ${weightPct}% weight` : ''}
                </div>
                <p className="text-slate-400">{help.summary}</p>
                <p className="mt-1 text-slate-500">
                  <span className="text-slate-400">Sources:</span> {help.sources}
                </p>
                <p className="mt-0.5 text-emerald-400/80">↑ {help.highMeans}</p>
                <p className="text-amber-400/80">↓ {help.lowMeans}</p>
                <p className="mt-1 text-slate-600 whitespace-pre-wrap">{tip}</p>
                <p className="mt-0.5 text-slate-600">{axisStatusHelp(status)}</p>
              </div>
            )}
          </div>
        )
      })}

      {scores.safetyFlags && scores.safetyFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1" data-testid="score-axis-safety-flags">
          {scores.safetyFlags.map((flag) => (
            <span
              key={`${flag.kind}:${flag.label}`}
              className="text-[9px] px-1.5 py-0.5 rounded border border-amber-700/50 bg-amber-900/30 text-amber-300 cursor-help"
              title={`${flag.kind} · ${flag.severity}\nSoft flag: may not hard-penalize composite unless AE policy is hard-penalty.`}
            >
              {flag.label}
            </span>
          ))}
        </div>
      )}

      {!compact && (scores.scorePhase || onOpenBreakdown) && (
        <div className="flex items-center gap-2 pt-0.5">
          {scores.scorePhase && (
            <p className="text-[9px] text-slate-600">
              Phase: {scores.scorePhase}
              {scores.rubricId ? ` · ${scores.rubricId}` : ''}
            </p>
          )}
          {onOpenBreakdown && (
            <button
              type="button"
              onClick={onOpenBreakdown}
              className="text-[9px] text-indigo-400 hover:text-indigo-300 ml-auto"
            >
              Weights
            </button>
          )}
        </div>
      )}
    </div>
  )
}
