'use client'

import { useRef } from 'react'
import { emitProductEvent } from '@/lib/productEvents'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

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
 * Uses shared StyledTooltip — never native title.
 */
export function PrefTooltip({ text, eventKey, align = 'left' }: PrefTooltipProps) {
  const fired = useRef(false)

  const onOpen = () => {
    if (fired.current) return
    fired.current = true
    emitProductEvent('preference_tooltip_opened', { key: eventKey })
  }

  return (
    <span
      className="ml-1 inline-flex align-middle"
      onMouseEnter={onOpen}
      onFocusCapture={onOpen}
    >
      <StyledTooltip content={text} side="bottom" align={align} testId={`pref-tip-${eventKey}`}>
        <span
          className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-slate-600 text-[9px] text-slate-400"
          tabIndex={0}
          aria-label={`More info: ${eventKey}`}
        >
          ?
        </span>
      </StyledTooltip>
    </span>
  )
}
