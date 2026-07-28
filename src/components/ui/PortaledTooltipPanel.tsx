'use client'

/**
 * Body-portaled tooltip/flyout panel — always above page-canvas.
 * Use for custom tip bodies that cannot use StyledTooltip’s simple content prop.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import {
  ensureTooltipZ,
  STYLED_TOOLTIP_Z,
  styledTooltipPanelStyle,
} from '@/lib/uiLayers'

export type PortaledTipSide = 'top' | 'bottom'
export type PortaledTipAlign = 'left' | 'right' | 'center'

export interface PortaledTooltipPanelProps {
  open: boolean
  /** Anchor element that owns the tip */
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
  id?: string
  side?: PortaledTipSide
  align?: PortaledTipAlign
  maxWidth?: string
  /** Allow clicks inside (provenance links, prompt scroll) */
  interactive?: boolean
  className?: string
  testId?: string
  /** Override z-index — still clamped to ≥ tooltip layer */
  zIndex?: number
}

function place(
  anchor: DOMRect,
  side: PortaledTipSide,
  align: PortaledTipAlign,
  panelW: number,
  panelH: number,
): { top: number; left: number; transform?: string } {
  const gap = 6
  const pad = 8
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  let top = side === 'bottom' ? anchor.bottom + gap : anchor.top - gap - panelH
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
    if (left - half < pad) left = pad + half
    else if (left + half > vw - pad) left = vw - pad - half
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
 * Renders tip content in a document.body portal with fixed positioning.
 * z-index is always ≥ STYLED_TOOLTIP_Z (never under page-canvas).
 */
export function PortaledTooltipPanel({
  open,
  anchorRef,
  children,
  id,
  side = 'top',
  align = 'left',
  maxWidth = '18rem',
  interactive = false,
  className = '',
  testId = 'portaled-tooltip-panel',
  zIndex,
}: PortaledTooltipPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [box, setBox] = useState<{
    top: number
    left: number
    transform?: string
  } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const anchor = el.getBoundingClientRect()
    const panel = panelRef.current
    const panelW = panel?.offsetWidth || 288
    const panelH = panel?.offsetHeight || 80
    setBox(place(anchor, side, align, panelW, panelH))
  }, [anchorRef, side, align])

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
  }, [open, children, updatePosition])

  if (!open || !mounted || typeof document === 'undefined') return null

  const z = ensureTooltipZ(zIndex ?? STYLED_TOOLTIP_Z)
  const style: CSSProperties = box
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

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="tooltip"
      data-testid={testId}
      data-z-layer="styled-tooltip"
      data-z-index={z}
      style={style}
      className={`${
        interactive ? 'pointer-events-auto' : 'pointer-events-none'
      } w-max max-w-[min(22rem,92vw)] rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-left text-[10px] leading-snug text-slate-300 shadow-xl shadow-black/50 ${className}`}
    >
      {children}
    </div>,
    document.body,
  )
}
