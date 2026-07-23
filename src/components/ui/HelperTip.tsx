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
