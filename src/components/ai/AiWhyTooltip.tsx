'use client'

/**
 * Styled “why AI recommended this” tooltip attached to the *actual* target.
 * - Wraps children (button, badge, list row text, …) — never a separate “why?” chip
 * - Body-portaled panel — never under page-canvas
 * - Custom hover/focus panel only — never set native `title` (no duplicate tooltips)
 */

import { useId, useRef, useState, type ReactNode } from 'react'
import type { AiWhyParts } from '@/lib/ai/aiWhyTooltip'
import { PortaledTooltipPanel } from '@/components/ui/PortaledTooltipPanel'

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
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <span
      ref={anchorRef}
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
      <span
        className="inline-flex max-w-full min-w-0"
        aria-describedby={open ? panelId : undefined}
      >
        {children}
      </span>
      <PortaledTooltipPanel
        open={open}
        anchorRef={anchorRef}
        id={panelId}
        side="bottom"
        align={align === 'right' ? 'right' : 'left'}
        maxWidth="18rem"
        testId={`${testId}-panel`}
        className="!border-violet-800/50"
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
      </PortaledTooltipPanel>
      <span className="sr-only">{why.fullText || why.summary}</span>
    </span>
  )
}
