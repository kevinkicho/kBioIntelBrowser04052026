'use client'

/**
 * Styled “why AI recommended this” tooltip attached to the *actual* target.
 * - Wraps children (button, badge, list row text, …) — never a separate “why?” chip
 * - Custom hover/focus panel only — never set native `title` (no duplicate tooltips)
 */

import { useId, useState, type ReactNode } from 'react'
import type { AiWhyParts } from '@/lib/ai/aiWhyTooltip'
import { STYLED_TOOLTIP_Z } from '@/components/ui/StyledTooltip'

export interface AiWhyTooltipProps {
  why: AiWhyParts
  /** The real UI control that owns the explanation (required). */
  children: ReactNode
  className?: string
  /** Prefer left/right placement in tight rows */
  align?: 'left' | 'right'
  testId?: string
}

export function AiWhyTooltip({
  why,
  children,
  className = '',
  align = 'left',
  testId = 'ai-why-tooltip',
}: AiWhyTooltipProps) {
  const uid = useId()
  const panelId = `${uid}-panel`
  const [open, setOpen] = useState(false)

  return (
    <span
      className={`relative inline-flex max-w-full items-center ${className}`}
      data-testid={testId}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        // Keep open while focus moves inside the wrapper
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false)
        }
      }}
    >
      <span
        className="inline-flex max-w-full min-w-0"
        aria-describedby={open ? panelId : undefined}
      >
        {children}
      </span>
      {open && (
        <span
          id={panelId}
          role="tooltip"
          data-testid={`${testId}-panel`}
          style={{ zIndex: STYLED_TOOLTIP_Z }}
          className={`pointer-events-none absolute mt-1 w-64 max-w-[min(18rem,80vw)] rounded-lg border border-violet-800/50 bg-slate-950 px-2.5 py-2 text-left shadow-xl shadow-black/40 ${
            align === 'right' ? 'right-0 top-full' : 'left-0 top-full'
          }`}
        >
          <span className="mb-1 block text-[10px] font-semibold text-violet-200">
            Why this AI suggestion
          </span>
          <span className="block space-y-0.5">
            {why.lines.map((line) => (
              <span
                key={line}
                className="block whitespace-pre-wrap text-[10px] leading-snug text-slate-300"
              >
                {line}
              </span>
            ))}
          </span>
          <span className="mt-1.5 block text-[9px] text-slate-600">
            Non-of-record · claim / evidence grounded · you verify
          </span>
        </span>
      )}
      <span className="sr-only">{why.fullText || why.summary}</span>
    </span>
  )
}
