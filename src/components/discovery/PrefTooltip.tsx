'use client'

import { useRef } from 'react'
import { emitProductEvent } from '@/lib/productEvents'

export interface PrefTooltipProps {
  /** Tooltip body copy */
  text: string
  /**
   * Preference key for M9 analytics (e.g. `rubricPreset`, `harvestTiming`).
   * Emits `preference_tooltip_opened` once per mount when opened.
   */
  eventKey: string
  /** Align flyout left (RubricEditor) vs right (drawer headers) */
  align?: 'left' | 'right'
}

/**
 * Accessible ? tooltip that records preference transparency (M9).
 */
export function PrefTooltip({ text, eventKey, align = 'left' }: PrefTooltipProps) {
  const fired = useRef(false)

  const onOpen = () => {
    if (fired.current) return
    fired.current = true
    emitProductEvent('preference_tooltip_opened', { key: eventKey })
  }

  const pos =
    align === 'right'
      ? 'right-0 top-5'
      : 'left-0 top-5'

  return (
    <span className="group relative inline-flex ml-1 align-middle">
      <span
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-600 text-[9px] text-slate-400 cursor-help"
        tabIndex={0}
        aria-label={`More info: ${eventKey}`}
        onMouseEnter={onOpen}
        onFocus={onOpen}
      >
        ?
      </span>
      <span
        className={`pointer-events-none absolute z-50 ${pos} w-64 rounded-lg border border-slate-700 bg-slate-900 p-2 text-[11px] leading-snug text-slate-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {text}
      </span>
    </span>
  )
}
