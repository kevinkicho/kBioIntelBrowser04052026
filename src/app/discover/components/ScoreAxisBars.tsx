'use client'

import type { AxisStatus, ScoreAxisKey, ScoreRubric, ScoreVector } from '@/lib/domain'
import { AXIS_LABELS, AXIS_ORDER } from '@/lib/profileMode'

export interface ScoreAxisBarsProps {
  scores: ScoreVector
  rubric?: ScoreRubric
  compact?: boolean
  onOpenBreakdown?: () => void
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

function EpistemicChip({ status }: { status: AxisStatus | undefined }) {
  const label = epistemicLabel(status)
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded border border-slate-600/60 bg-slate-800/60 text-slate-500 font-medium whitespace-nowrap"
      data-testid="score-axis-epistemic"
      data-status={label}
      title={`Axis status: ${label}`}
    >
      {label}
    </span>
  )
}

/**
 * Multi-axis ScoreVector bars using shared AXIS_ORDER.
 * Null axes render an epistemic chip — never a zero bar.
 */
export function ScoreAxisBars({
  scores,
  rubric,
  compact = false,
  onOpenBreakdown,
}: ScoreAxisBarsProps) {
  const weights = rubric?.weights ?? scores.weights
  const labelWidth = compact ? 'w-[72px]' : 'w-24'

  return (
    <div
      className={compact ? 'space-y-1' : 'space-y-1.5'}
      data-testid="score-axis-bars"
      data-score-phase={scores.scorePhase}
    >
      {!compact && (
        <p
          className="text-[9px] leading-snug text-slate-600 mb-0.5"
          data-testid="score-trust-footnote"
        >
          Investigation priority only — not a prediction of clinical success. Empty safety ≠ safe.
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
      )}
      {AXIS_ORDER.map((key) => {
        const v = scores.axes[key]
        const status = scores.axisStatus[key]
        const missing = v == null
        const weightPct =
          weights && typeof weights[key] === 'number'
            ? Math.round(weights[key] * 100)
            : null

        return (
          <div
            key={key}
            className="flex items-center gap-2"
            data-testid={`score-axis-row-${key}`}
            data-axis={key}
            data-missing={missing ? 'true' : 'false'}
          >
            <span
              className={`text-[10px] text-slate-500 ${labelWidth} shrink-0 truncate`}
              title={
                weightPct != null
                  ? `${AXIS_LABELS[key]} (${weightPct}% weight)`
                  : AXIS_LABELS[key]
              }
            >
              {AXIS_LABELS[key]}
            </span>
            {missing ? (
              <div className="flex-1 flex items-center min-h-[6px]">
                <EpistemicChip status={status} />
              </div>
            ) : (
              <div className="flex-1 bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
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
          </div>
        )
      })}

      {scores.safetyFlags && scores.safetyFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1" data-testid="score-axis-safety-flags">
          {scores.safetyFlags.map((flag) => (
            <span
              key={`${flag.kind}:${flag.label}`}
              className="text-[9px] px-1.5 py-0.5 rounded border border-amber-700/50 bg-amber-900/30 text-amber-300"
              title={`${flag.kind} · ${flag.severity}`}
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
