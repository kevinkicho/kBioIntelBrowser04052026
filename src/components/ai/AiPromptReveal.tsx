'use client'

/**
 * Prompt transparency — compact “Prompt” control with a styled hover/focus panel.
 * Never uses native title or long “Show prompt…” labels (space + distraction).
 * Opacity 0.3 at rest so it stays secondary to the main content.
 */

import { useId, useState } from 'react'
import { STYLED_TOOLTIP_Z } from '@/components/ui/StyledTooltip'

export interface AiPromptRevealProps {
  system?: string | null
  user?: string | null
  mode?: string
  version?: string
  /** @deprecated Always renders as “Prompt” — kept for call-site compat */
  label?: string
  className?: string
  testId?: string
  /** left | right placement for the panel */
  align?: 'left' | 'right'
}

export function AiPromptReveal({
  system,
  user,
  mode,
  version,
  className = '',
  testId = 'ai-prompt-reveal',
  align = 'left',
}: AiPromptRevealProps) {
  const uid = useId()
  const panelId = `${uid}-panel`
  const [open, setOpen] = useState(false)

  if (!system && !user) return null

  const meta = [mode, version].filter(Boolean).join(' · ')

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
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
      <button
        type="button"
        className="rounded border border-slate-700/60 bg-transparent px-1.5 py-0.5 text-[10px] text-slate-400 opacity-30 transition-opacity hover:opacity-100 hover:text-indigo-300 focus:outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-indigo-500/50"
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        data-testid={`${testId}-toggle`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        Prompt
      </button>
      {open && (
        <span
          id={panelId}
          role="tooltip"
          data-testid={`${testId}-panel`}
          style={{ zIndex: STYLED_TOOLTIP_Z }}
          className={`absolute mt-1 w-[min(22rem,calc(100vw-1.5rem))] max-h-72 overflow-y-auto rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-2 text-left shadow-xl shadow-black/50 ${
            align === 'right' ? 'right-0 top-full' : 'left-0 top-full'
          }`}
        >
          <span className="mb-1 block text-[10px] font-semibold text-indigo-200">
            Prompt{meta ? ` · ${meta}` : ''}
          </span>
          <span className="mb-1.5 block text-[9px] leading-relaxed text-slate-600">
            Exact system + user text sent to your model. Not a regulatory record. Of-record ranks
            stay deterministic free-API scores.
          </span>
          {system && (
            <span className="mb-2 block">
              <span className="block text-[9px] uppercase tracking-wide text-slate-500">
                System ({system.length.toLocaleString()} chars)
              </span>
              <pre
                className="mt-0.5 max-h-28 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-900/80 p-1.5 font-mono text-[9px] leading-snug text-slate-400"
                data-testid={`${testId}-system`}
              >
                {system}
              </pre>
            </span>
          )}
          {user && (
            <span className="block">
              <span className="block text-[9px] uppercase tracking-wide text-slate-500">
                User ({user.length.toLocaleString()} chars)
              </span>
              <pre
                className="mt-0.5 max-h-32 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-900/80 p-1.5 font-mono text-[9px] leading-snug text-slate-400"
                data-testid={`${testId}-user`}
              >
                {user}
              </pre>
            </span>
          )}
        </span>
      )}
    </span>
  )
}
