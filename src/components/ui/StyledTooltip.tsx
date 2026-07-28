'use client'

/**
 * Canonical styled tooltip — never use native HTML `title` for hover help.
 * Hover / focus only; no browser yellow tooltips, no double-tips.
 *
 * Always body-portaled with z-index above page-canvas (see uiLayers).
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  ensureTooltipZ,
  STYLED_TOOLTIP_Z,
  styledTooltipPanelStyle,
  Z_PAGE_CANVAS,
} from '@/lib/uiLayers'

export type StyledTooltipSide = 'top' | 'bottom'
export type StyledTooltipAlign = 'left' | 'right' | 'center'

/** @deprecated Import STYLED_TOOLTIP_Z from @/lib/uiLayers — re-export for callers */
export { STYLED_TOOLTIP_Z, Z_PAGE_CANVAS, ensureTooltipZ, styledTooltipPanelStyle }

/**
 * Highest product UI layer for hover/focus tips.
 * Above: header (40), modals (50–200), typeahead (10k), page-canvas (0).
 */
export const STYLED_TOOLTIP_Z_MIN = STYLED_TOOLTIP_Z

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
  /**
   * Optional z-index override — still clamped to ≥ STYLED_TOOLTIP_Z
   * so tips never paint under page-canvas.
   */
  zIndex?: number
}

interface PanelBox {
  top: number
  left: number
  transform?: string
}

function placePanel(
  anchor: DOMRect,
  side: StyledTooltipSide,
  align: StyledTooltipAlign,
  panelW: number,
  panelH: number,
): PanelBox {
  const gap = 6
  const pad = 8
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  let top = side === 'bottom' ? anchor.bottom + gap : anchor.top - gap - panelH
  // Flip if clipped
  if (side === 'top' && top < pad) {
    top = anchor.bottom + gap
  } else if (side === 'bottom' && top + panelH > vh - pad) {
    top = Math.max(pad, anchor.top - gap - panelH)
  }

  let left: number
  let transform: string | undefined
  if (align === 'center') {
    left = anchor.left + anchor.width / 2
    transform = 'translateX(-50%)'
    const half = panelW / 2
    if (left - half < pad) {
      left = pad + half
    } else if (left + half > vw - pad) {
      left = vw - pad - half
    }
  } else if (align === 'right') {
    left = anchor.right - panelW
    if (left < pad) left = pad
  } else {
    left = anchor.left
    if (left + panelW > vw - pad) left = Math.max(pad, vw - pad - panelW)
  }

  if (top < pad) top = pad
  if (top + panelH > vh - pad) top = Math.max(pad, vh - pad - panelH)

  return { top, left, transform }
}

/**
 * Wrap any control with a dark slate flyout on hover/focus.
 * Prefer this over `title="..."` everywhere in product UI.
 * Panel always portals to body with z-index above page-canvas.
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
  zIndex,
}: StyledTooltipProps) {
  const uid = useId()
  const panelId = `${uid}-tip`
  const triggerRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [box, setBox] = useState<PanelBox | null>(null)

  const text =
    content == null || content === false
      ? ''
      : typeof content === 'string'
        ? content.trim()
        : content
  const hasContent =
    typeof text === 'string' ? text.length > 0 : Boolean(text)

  const z = ensureTooltipZ(zIndex ?? STYLED_TOOLTIP_Z)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const anchor = el.getBoundingClientRect()
    const panel = panelRef.current
    const panelW = panel?.offsetWidth || 256
    const panelH = panel?.offsetHeight || 48
    setBox(placePanel(anchor, side, align, panelW, panelH))
  }, [side, align])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    let raf = 0
    const onWin = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        updatePosition()
      })
    }
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
  }, [open, text, updatePosition])

  if (disabled || !hasContent) {
    return <>{children}</>
  }

  const panelStyle: CSSProperties = box
    ? styledTooltipPanelStyle({
        top: box.top,
        left: box.left,
        transform: box.transform,
        maxWidth,
        zIndex: z,
      })
    : styledTooltipPanelStyle({
        visibility: 'hidden',
        maxWidth,
        zIndex: z,
      })

  const panel =
    open &&
    mounted &&
    createPortal(
      <span
        ref={panelRef}
        id={panelId}
        role="tooltip"
        data-testid={`${testId}-panel`}
        data-z-layer="styled-tooltip"
        data-z-index={z}
        style={panelStyle}
        className={`styled-tooltip-panel pointer-events-none w-max max-w-[min(18rem,92vw)] rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-left text-[10px] leading-snug text-slate-300 shadow-xl shadow-black/50 whitespace-pre-wrap ${panelClassName}`}
      >
        {text}
      </span>,
      document.body,
    )

  return (
    <span
      ref={triggerRef}
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
      {panel}
    </span>
  )
}
