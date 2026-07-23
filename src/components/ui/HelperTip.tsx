'use client'

/**
 * Compact (i) control that shows helper / honesty copy in a StyledTooltip.
 * Prefer this over always-visible slate helper paragraphs to reduce UI clutter.
 */

import type { ReactNode } from 'react'
import {
  StyledTooltip,
  type StyledTooltipAlign,
  type StyledTooltipSide,
} from '@/components/ui/StyledTooltip'

export interface HelperTipProps {
  /** Helper / disclaimer text (string or rich node). Empty → render nothing. */
  content?: ReactNode
  /** Accessible name for the trigger (default: “About this section”) */
  label?: string
  side?: StyledTooltipSide
  align?: StyledTooltipAlign
  /** Wider panel for longer honesty notes */
  maxWidth?: string
  className?: string
  testId?: string
  /** Optional custom trigger; default is a small (i) glyph */
  children?: ReactNode
}

/**
 * Small info trigger with hover/focus help. Use next to headings, labels, or
 * panel titles instead of permanent footer/intro prose.
 */
export function HelperTip({
  content,
  label = 'About this section',
  side = 'top',
  align = 'left',
  maxWidth = '18rem',
  className = '',
  testId = 'helper-tip',
  children,
}: HelperTipProps) {
  if (content == null || content === false || content === '') return null
  if (typeof content === 'string' && !content.trim()) return null

  return (
    <StyledTooltip
      content={content}
      side={side}
      align={align}
      maxWidth={maxWidth}
      className={className}
      testId={testId}
    >
      {children ?? (
        <button
          type="button"
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-600/80 bg-slate-800/80 text-[9px] font-semibold leading-none text-slate-400 hover:border-slate-500 hover:text-slate-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 cursor-help"
          aria-label={label}
          data-testid={`${testId}-trigger`}
        >
          i
        </button>
      )}
    </StyledTooltip>
  )
}

export interface DescriptionTipProps {
  /** Full description / abstract / definition text */
  text?: string | null
  /** Short visible label (default Description) */
  label?: string
  className?: string
  testId?: string
  maxWidth?: string
}

/**
 * Replace always-visible line-clamped descriptions with a compact “Description” chip + tooltip.
 */
export function DescriptionTip({
  text,
  label = 'Description',
  className = 'mt-0.5',
  testId = 'description-tip',
  maxWidth = '20rem',
}: DescriptionTipProps) {
  const t = (text || '').trim()
  if (!t) return null
  return (
    <HelperTip content={t} label={label} className={className} testId={testId} maxWidth={maxWidth}>
      <span className="inline-flex cursor-help items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300">
        {label}
        <span
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-600/80 text-[9px] font-semibold leading-none"
          aria-hidden
        >
          i
        </span>
      </span>
    </HelperTip>
  )
}

export interface StatementTipProps {
  /** Full claim / prose statement */
  statement?: string | null
  /** Short visible label (default Statement) */
  label?: string
  className?: string
  testId?: string
  maxWidth?: string
}

/** Claim / narrative statement — title chip only; full text on hover. */
export function StatementTip({
  statement,
  label = 'Statement',
  className = 'mt-0.5',
  testId = 'statement-tip',
  maxWidth = '22rem',
}: StatementTipProps) {
  return (
    <DescriptionTip
      text={statement}
      label={label}
      className={className}
      testId={testId}
      maxWidth={maxWidth}
    />
  )
}

export interface EmptyStateTipProps {
  /** Full empty / error message */
  message?: string | null
  /** Short visible badge */
  badge?: string
  tone?: 'empty' | 'error' | 'warn'
  className?: string
  testId?: string
  children?: ReactNode
}

/** Empty / error copy lives in tooltip; badge stays compact. */
export function EmptyStateTip({
  message,
  badge = 'No data',
  tone = 'empty',
  className = '',
  testId = 'empty-state-tip',
  children,
}: EmptyStateTipProps) {
  const msg = (message || '').trim()
  const toneClass =
    tone === 'error'
      ? 'border-red-800/50 bg-red-950/30 text-red-300'
      : tone === 'warn'
        ? 'border-amber-800/50 bg-amber-950/30 text-amber-200'
        : 'border-slate-700 bg-slate-900/50 text-slate-500'
  if (!msg && !children) {
    return (
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${toneClass} ${className}`}
        data-testid={testId}
      >
        {badge}
      </span>
    )
  }
  return (
    <HelperTip content={msg || children} label={badge} className={className} testId={testId}>
      <span
        className={`inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${toneClass}`}
        data-testid={`${testId}-badge`}
      >
        {badge}
        <span className="text-[9px] opacity-70" aria-hidden>
          i
        </span>
      </span>
    </HelperTip>
  )
}

export interface ExternalLinkTipProps {
  href: string
  /** Visible short label */
  label: string
  /** Longer tooltip (defaults to label + href) */
  title?: string
  className?: string
  testId?: string
  onClick?: () => void
}

/** Portal / download / registry link as short chip; full purpose + URL on hover. */
export function ExternalLinkTip({
  href,
  label,
  title,
  className = '',
  testId = 'external-link-tip',
  onClick,
}: ExternalLinkTipProps) {
  const tip = title?.trim() || `${label}\n${href}`
  return (
    <StyledTooltip content={tip} maxWidth="18rem" testId={testId}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={`inline-flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline ${className}`}
        data-testid={`${testId}-anchor`}
      >
        {label}
        <span className="text-[9px] text-slate-600" aria-hidden>
          ↗
        </span>
      </a>
    </StyledTooltip>
  )
}

export interface MetricTipProps {
  /** Visible primary value (number or short string) */
  value: ReactNode
  /** Metric name for a11y */
  label: string
  /** Full explanation / units / secondary metrics */
  detail?: string | null
  className?: string
  testId?: string
}

/** Keep the number visible; units / secondary lines go in the tooltip. */
export function MetricTip({
  value,
  label,
  detail,
  className = '',
  testId = 'metric-tip',
}: MetricTipProps) {
  const tip = [label, detail].filter(Boolean).join('\n\n')
  if (!detail?.trim()) {
    return (
      <span className={className} data-testid={testId} aria-label={label}>
        {value}
      </span>
    )
  }
  return (
    <StyledTooltip content={tip} maxWidth="16rem" testId={testId}>
      <span
        className={`cursor-help tabular-nums underline decoration-dotted decoration-slate-600 underline-offset-2 ${className}`}
        aria-label={label}
      >
        {value}
      </span>
    </StyledTooltip>
  )
}
