'use client'

import type { AxisStatus, ScoreAxisKey, ScoreRubric, ScoreVector } from '@/lib/domain'
import { AXIS_LABELS, AXIS_ORDER } from '@/lib/profileMode'
import { AXIS_HELP } from '@/lib/domain/scoreAxisHelp'
import { ScoreExplainer } from '@/components/score/ScoreExplainer'
import { ScoreMathTooltip, ScoreValueWithMath } from '@/components/score/ScoreMathTooltip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

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
      return 'bg-sky-500'
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

function axisGlow(key: ScoreAxisKey): string {
  switch (key) {
    case 'efficacy':
      return 'shadow-indigo-500/20'
    case 'clinicalStage':
      return 'shadow-sky-500/20'
    case 'safety':
      return 'shadow-emerald-500/20'
    case 'novelty':
      return 'shadow-amber-500/20'
    case 'identityTrust':
      return 'shadow-cyan-500/20'
    default:
      return ''
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
  const tone =
    label === 'empty' || label === 'not-retrieved'
      ? 'border-slate-600/70 bg-slate-800/70 text-slate-400'
      : label === 'error' || label === 'timeout'
        ? 'border-amber-700/50 bg-amber-950/40 text-amber-300/90'
        : 'border-slate-600/60 bg-slate-800/60 text-slate-500'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${tone}`}
      data-testid="score-axis-epistemic"
      data-status={label}
    >
      <span className="h-1 w-1 rounded-full bg-current opacity-70" aria-hidden />
      {label}
    </span>
  )
}

/**
 * Multi-axis ScoreVector bars using shared AXIS_ORDER.
 * Null axes render an epistemic chip — never a zero bar.
 * Always styled math tooltips (never native title).
 */
export function ScoreAxisBars({
  scores,
  rubric,
  compact = false,
  onOpenBreakdown,
  showExplainer,
}: ScoreAxisBarsProps) {
  const weights = rubric?.weights ?? scores.weights
  const explainerOn = showExplainer ?? !compact
  const compositePct = Math.round(scores.composite * 100)

  return (
    <div
      className={
        compact
          ? 'space-y-1.5'
          : 'overflow-hidden rounded-xl border border-slate-800/90 bg-gradient-to-b from-slate-900/80 to-slate-950/60'
      }
      data-testid="score-axis-bars"
      data-score-phase={scores.scorePhase}
    >
      {!compact && (
        <div className="border-b border-slate-800/80 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Score breakdown
                </span>
                {scores.scorePhase && (
                  <span className="rounded-full border border-slate-700/80 bg-slate-900/80 px-1.5 py-px text-[9px] font-medium text-slate-400">
                    {scores.scorePhase}
                    {scores.rubricId ? ` · ${scores.rubricId}` : ''}
                  </span>
                )}
              </div>
              <p
                className="mt-1 text-[10px] leading-snug text-slate-500"
                data-testid="score-trust-footnote"
              >
                Investigation priority only — not a prediction of clinical success.
                <span className="text-slate-600"> · </span>
                <span className="text-amber-500/90">Empty safety ≠ safe</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <ScoreValueWithMath
                composite
                scores={scores}
                rubric={rubric}
                testId="score-axis-composite-math"
              >
                <div className="flex flex-col items-end rounded-lg border border-indigo-800/40 bg-indigo-950/40 px-2.5 py-1.5 cursor-help">
                  <span className="text-[9px] font-medium uppercase tracking-wide text-indigo-300/80">
                    Composite
                  </span>
                  <span className="text-lg font-semibold tabular-nums leading-none text-indigo-100">
                    {compositePct}
                    <span className="text-sm font-medium text-indigo-300/70">%</span>
                  </span>
                </div>
              </ScoreValueWithMath>
              {explainerOn && <ScoreExplainer rubric={rubric} scores={scores} compact />}
            </div>
          </div>
          {onOpenBreakdown && (
            <button
              type="button"
              onClick={onOpenBreakdown}
              className="mt-2 text-[10px] text-indigo-400/90 hover:text-indigo-300 underline-offset-2 hover:underline"
            >
              How scoring works
            </button>
          )}
        </div>
      )}

      {compact && explainerOn && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <ScoreValueWithMath
            composite
            scores={scores}
            rubric={rubric}
            testId="score-axis-composite-math"
          >
            <span className="text-[10px] text-slate-400 cursor-help">
              Composite{' '}
              <span className="font-semibold tabular-nums text-slate-200">{compositePct}%</span>
            </span>
          </ScoreValueWithMath>
          <ScoreExplainer rubric={rubric} scores={scores} compact />
        </div>
      )}

      <ul className={compact ? 'space-y-1' : 'divide-y divide-slate-800/60 px-2 py-1'}>
        {AXIS_ORDER.map((key) => {
          const v = scores.axes[key]
          const status = scores.axisStatus[key]
          const missing = v == null
          const weightPct =
            weights && typeof weights[key] === 'number'
              ? Math.round(weights[key] * 100)
              : null
          const help = AXIS_HELP[key]
          const pct = missing ? null : Math.round((v as number) * 100)

          return (
            <li key={key}>
              <ScoreMathTooltip
                axis={key}
                scores={scores}
                rubric={rubric}
                side="top"
                align="left"
                className="w-full"
                testId={`score-axis-math-${key}`}
              >
                <div
                  className={`group flex w-full cursor-help items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-slate-800/40 ${
                    compact ? 'py-1' : ''
                  }`}
                  data-testid={`score-axis-row-${key}`}
                  data-axis={key}
                  data-missing={missing ? 'true' : 'false'}
                >
                  <div className="w-[5.5rem] shrink-0 sm:w-28">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${axisBarColor(key)} ${
                          missing ? 'opacity-30' : ''
                        }`}
                        aria-hidden
                      />
                      <span className="truncate text-[11px] font-medium text-slate-300">
                        {AXIS_LABELS[key]}
                      </span>
                    </div>
                    {weightPct != null && !compact && (
                      <span className="ml-3 mt-0.5 inline-block rounded border border-slate-700/70 bg-slate-900/80 px-1 py-px text-[8px] font-medium tabular-nums text-slate-500">
                        weight {weightPct}%
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {missing ? (
                      <div
                        className="flex h-2 items-center rounded-full border border-dashed border-slate-700/80 bg-slate-900/40 px-1"
                        aria-label={`${help.summary} not retrieved`}
                      >
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
                      </div>
                    ) : (
                      <div
                        className="relative h-2 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-inset ring-slate-700/50"
                        aria-label={`${help.summary} ${axisPct(v)}`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full shadow-sm transition-all duration-500 ${axisBarColor(key)} ${axisGlow(key)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex w-[4.25rem] shrink-0 flex-col items-end gap-0.5">
                    {missing ? (
                      <EpistemicChip status={status} />
                    ) : (
                      <span className="text-[12px] font-semibold tabular-nums text-slate-100">
                        {axisPct(v)}
                      </span>
                    )}
                    {!missing && weightPct != null && compact && (
                      <span className="text-[8px] tabular-nums text-slate-600">w {weightPct}%</span>
                    )}
                  </div>
                </div>
              </ScoreMathTooltip>
            </li>
          )
        })}
      </ul>

      {scores.safetyFlags && scores.safetyFlags.length > 0 && (
        <div
          className={`flex flex-wrap gap-1 ${compact ? 'pt-1' : 'border-t border-slate-800/80 px-3 py-2'}`}
          data-testid="score-axis-safety-flags"
        >
          {scores.safetyFlags.map((flag) => (
            <StyledTooltip
              key={`${flag.kind}:${flag.label}`}
              content={`${flag.kind} · ${flag.severity}\nSoft flag: may not hard-penalize composite unless AE policy is hard-penalty.\nSafety axis: S = 1 − (0.5·aeRisk + 0.3·seriousRisk + 0.2·recallRisk) with log-compressed FAERS counts.`}
            >
              <span className="cursor-help rounded-md border border-amber-700/50 bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-medium text-amber-300">
                {flag.label}
              </span>
            </StyledTooltip>
          ))}
        </div>
      )}

      {!compact && onOpenBreakdown && (
        <div className="flex justify-end border-t border-slate-800/80 px-3 py-1.5">
          <button
            type="button"
            onClick={onOpenBreakdown}
            className="text-[9px] text-indigo-400 hover:text-indigo-300"
          >
            Edit weights
          </button>
        </div>
      )}
    </div>
  )
}
