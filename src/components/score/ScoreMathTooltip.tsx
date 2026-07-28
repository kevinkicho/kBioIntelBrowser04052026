'use client'

/**
 * Styled scientific tooltip for every product “score” surface.
 * Shows formula + derivation steps + honesty — never native title.
 */

import type { ReactNode } from 'react'
import type { ScoreAxisKey, ScoreRubric, ScoreVector } from '@/lib/domain'
import {
  buildAxisMathPanel,
  buildCompositeMathPanel,
  buildGeneAssocMathPanel,
  formatCompositeMathOnly,
  type ScoreMathPanel,
} from '@/lib/domain/scoreAxisHelp'
import {
  StyledTooltip,
  type StyledTooltipAlign,
  type StyledTooltipSide,
} from '@/components/ui/StyledTooltip'

function ScoreMathPanelBody({ panel }: { panel: ScoreMathPanel }) {
  return (
    <span className="block space-y-1.5 text-left" data-testid="score-math-panel-body">
      <span className="block text-[11px] font-semibold text-slate-100">{panel.title}</span>
      {panel.valueLine && (
        <span className="block text-[10px] tabular-nums text-emerald-300/90">
          {panel.valueLine}
        </span>
      )}
      <span className="block rounded border border-indigo-800/40 bg-indigo-950/40 px-1.5 py-1 font-mono text-[9px] leading-snug text-indigo-200">
        {panel.formula}
      </span>
      <span className="block space-y-0.5">
        {panel.steps.map((step, i) => (
          <span key={i} className="block text-[9px] leading-snug text-slate-400">
            <span className="text-slate-600">·</span> {step}
          </span>
        ))}
      </span>
      {panel.contributionLine && (
        <span className="block text-[9px] text-cyan-400/80">{panel.contributionLine}</span>
      )}
      {panel.statusLine && (
        <span className="block text-[9px] text-slate-500">{panel.statusLine}</span>
      )}
      <span className="block border-t border-slate-700/80 pt-1 text-[9px] text-slate-500">
        <span className="text-slate-400">Range:</span> {panel.range}
      </span>
      <span className="block text-[9px] leading-snug text-slate-500">{panel.science}</span>
      <span className="block text-[8px] leading-snug text-amber-200/70">{panel.disclaimer}</span>
    </span>
  )
}

export interface ScoreMathTooltipProps {
  children: ReactNode
  /** Axis math (preferred when scores known) */
  axis?: ScoreAxisKey
  /** Full vector for live contribution lines */
  scores?: ScoreVector | null
  rubric?: ScoreRubric
  /** Composite math (default when axis omitted) */
  composite?: boolean
  /** Gene–disease association score */
  geneAssociation?: boolean
  geneScore?: number | null
  /** Prebuilt panel (escape hatch) */
  panel?: ScoreMathPanel
  /** Fallback plain math when no vector (legacy composite %) */
  legacyComposite?: number | null
  side?: StyledTooltipSide
  align?: StyledTooltipAlign
  className?: string
  maxWidth?: string
  testId?: string
  disabled?: boolean
}

/**
 * Wrap any score number/bar/label with a math-first StyledTooltip.
 */
export function ScoreMathTooltip({
  children,
  axis,
  scores,
  rubric,
  composite,
  geneAssociation,
  geneScore,
  panel: panelProp,
  legacyComposite,
  side = 'top',
  align = 'left',
  className = '',
  maxWidth = '22rem',
  testId = 'score-math-tooltip',
  disabled = false,
}: ScoreMathTooltipProps) {
  let panel: ScoreMathPanel | null = panelProp ?? null
  let plainFallback = ''

  if (!panel) {
    if (geneAssociation) {
      panel = buildGeneAssocMathPanel(geneScore)
    } else if (axis) {
      panel = buildAxisMathPanel(axis, scores ?? undefined, rubric)
    } else if (scores) {
      panel = buildCompositeMathPanel(scores, rubric)
    } else if (legacyComposite != null) {
      // Full math + live percent when only a scalar composite is available
      panel = {
        ...buildCompositeMathPanel(undefined, rubric),
        valueLine: `Composite ≈ ${Math.round(legacyComposite * 100)}% (legacy / snapshot scalar)`,
      }
    } else if (composite) {
      panel = buildCompositeMathPanel(undefined, rubric)
    } else {
      plainFallback = formatCompositeMathOnly(null)
    }
  }

  const content = panel ? (
    <ScoreMathPanelBody panel={panel} />
  ) : (
    plainFallback
  )

  return (
    <StyledTooltip
      content={content}
      side={side}
      align={align}
      className={className}
      maxWidth={maxWidth}
      testId={testId}
      disabled={disabled}
      panelClassName="!max-w-[min(22rem,92vw)] !whitespace-normal"
    >
      {children}
    </StyledTooltip>
  )
}

/** Dotted-underline wrapper for score values that invites hover math. */
export function ScoreValueWithMath({
  children,
  className = '',
  ...tip
}: Omit<ScoreMathTooltipProps, 'children'> & {
  children: ReactNode
  className?: string
}) {
  return (
    <ScoreMathTooltip {...tip} className={className}>
      <span
        className="cursor-help underline decoration-dotted decoration-slate-600 underline-offset-2"
        data-testid="score-value-with-math"
      >
        {children}
      </span>
    </ScoreMathTooltip>
  )
}
