'use client'

/**
 * Accessible “why AI recommended this” tooltip for suggestions / rank chips.
 * Uses focus + hover; also sets native title for quick hover on dense lists.
 */

import { useId, useState, type ReactNode } from 'react'
import type { AiWhyParts } from '@/lib/ai/aiWhyTooltip'

export interface AiWhyTooltipProps {
  why: AiWhyParts
  /** Visible trigger content (badge, icon, etc.) */
  children?: ReactNode
  /** Default: small “why?” chip */
  label?: string
  className?: string
  /** Prefer left/right placement in tight rows */
  align?: 'left' | 'right'
  testId?: string
}

export function AiWhyTooltip({
  why,
  children,
  label = 'why?',
  className = '',
  align = 'left',
  testId = 'ai-why-tooltip',
}: AiWhyTooltipProps) {
  const uid = useId()
  const panelId = `${uid}-panel`
  const [open, setOpen] = useState(false)

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      data-testid={testId}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center gap-0.5 rounded border border-violet-800/50 bg-violet-950/40 px-1 py-0.5 text-[9px] font-medium text-violet-200/90 hover:bg-violet-900/50 hover:text-violet-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
        aria-describedby={open ? panelId : undefined}
        aria-expanded={open}
        aria-label={why.summary || 'Why AI recommended this'}
        title={why.fullText}
        data-testid={`${testId}-trigger`}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        {children ?? (
          <>
            <span aria-hidden className="opacity-80">
              ?
            </span>
            <span>{label}</span>
          </>
        )}
      </button>
      {open && (
        <span
          id={panelId}
          role="tooltip"
          data-testid={`${testId}-panel`}
          className={`absolute z-50 mt-1 w-64 max-w-[min(18rem,80vw)] rounded-lg border border-violet-800/50 bg-slate-950 px-2.5 py-2 text-left shadow-xl shadow-black/40 ${
            align === 'right' ? 'right-0 top-full' : 'left-0 top-full'
          }`}
        >
          <span className="block text-[10px] font-semibold text-violet-200 mb-1">
            Why this AI suggestion
          </span>
          <span className="block space-y-0.5">
            {why.lines.map((line) => (
              <span
                key={line}
                className="block text-[10px] leading-snug text-slate-300 whitespace-pre-wrap"
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
    </span>
  )
}
