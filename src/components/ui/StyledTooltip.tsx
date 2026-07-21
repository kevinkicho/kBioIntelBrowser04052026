'use client'

/**
 * Canonical styled tooltip — never use native HTML `title` for hover help.
 * Hover / focus only; no browser yellow tooltips, no double-tips.
 */

import {
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

export type StyledTooltipSide = 'top' | 'bottom'
export type StyledTooltipAlign = 'left' | 'right' | 'center'

export interface StyledTooltipProps {
  /** Tooltip body (string or rich node). Empty → children only. */
  content?: ReactNode
  children: ReactNode
  side?: StyledTooltipSide
  align?: StyledTooltipAlign
  /** Wrapper class (default inline-flex so layout stays compact) */
  className?: string
  /** Panel class overrides */
  panelClassName?: string
  /** Max width of the panel */
  maxWidth?: string
  disabled?: boolean
  testId?: string
}

function placementClass(side: StyledTooltipSide, align: StyledTooltipAlign): string {
  const v = side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
  const h =
    align === 'right'
      ? 'right-0'
      : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-0'
  return `${v} ${h}`
}

/**
 * Wrap any control with a dark slate flyout on hover/focus.
 * Prefer this over `title="..."` everywhere in product UI.
 */
export function StyledTooltip({
  content,
  children,
  side = 'top',
  align = 'left',
  className = '',
  panelClassName = '',
  maxWidth = '16rem',
  disabled = false,
  testId = 'styled-tooltip',
}: StyledTooltipProps) {
  const uid = useId()
  const panelId = `${uid}-tip`
  const [open, setOpen] = useState(false)

  const text =
    content == null || content === false
      ? ''
      : typeof content === 'string'
        ? content.trim()
        : content
  const hasContent =
    typeof text === 'string' ? text.length > 0 : Boolean(text)

  if (disabled || !hasContent) {
    return <>{children}</>
  }

  const panelStyle: CSSProperties = { maxWidth }

  return (
    <span
      className={`relative inline-flex max-w-full items-center ${className}`}
      data-testid={testId}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false)
        }
      }}
    >
      <span className="inline-flex max-w-full min-w-0" aria-describedby={open ? panelId : undefined}>
        {children}
      </span>
      {open && (
        <span
          id={panelId}
          role="tooltip"
          data-testid={`${testId}-panel`}
          style={panelStyle}
          className={`pointer-events-none absolute z-[80] w-max max-w-[min(18rem,92vw)] rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-left text-[10px] leading-snug text-slate-300 shadow-xl shadow-black/50 whitespace-pre-wrap ${placementClass(
            side,
            align,
          )} ${panelClassName}`}
        >
          {text}
        </span>
      )}
    </span>
  )
}
