/**
 * Product stacking scale — canvas content is always below styled tooltips.
 *
 * Rule: any hover/focus tip panel must use STYLED_TOOLTIP_Z (or higher) and
 * portal to document.body so parent overflow/isolation cannot bury it.
 */

import type { CSSProperties } from 'react'

/** Page main canvas (Discover, projects, profile content) */
export const Z_PAGE_CANVAS = 0

/** Search history sidebar rail */
export const Z_SIDEBAR = 30

/** Sticky app header */
export const Z_HEADER = 40

/** Density toggle / non-modal chrome */
export const Z_CHROME_FAB = 55

/** AI copilot FAB */
export const Z_COPILOT_FAB = 60

/** Generic modal overlays (panel API, regenerate) */
export const Z_MODAL = 80

/** AI config / heavier modals */
export const Z_MODAL_HIGH = 200

/** Graph / neighborhood fixed popovers (legacy; prefer tooltip layer) */
export const Z_GRAPH_POPOVER = 300

/** Typeahead / search suggest menus */
export const Z_TYPEAHEAD = 10_000

/**
 * Styled tooltips, provenance chips, score math, AI why tips.
 * Always above page-canvas and all in-canvas sticky chrome.
 * Never set a tip panel below this value.
 */
export const Z_STYLED_TOOLTIP = 50_000

/** Alias used across components */
export const STYLED_TOOLTIP_Z = Z_STYLED_TOOLTIP

/** CSS custom property names (set on :root in globals.css) */
export const CSS_Z = {
  canvas: '--z-page-canvas',
  sidebar: '--z-sidebar',
  header: '--z-header',
  tooltip: '--z-styled-tooltip',
} as const

/**
 * Inline style for any portaled tip panel.
 * Enforces z-index ≥ tooltip layer so nothing paints under canvas.
 */
export function styledTooltipPanelStyle(
  extra?: CSSProperties,
): CSSProperties {
  return {
    position: 'fixed',
    zIndex: Z_STYLED_TOOLTIP,
    // Also surface the CSS var for cascade consumers
    ...extra,
  }
}

/** True if a numeric z-index is strictly above page canvas layer */
export function isAboveCanvasZ(z: number | undefined | null): boolean {
  if (z == null || Number.isNaN(z)) return false
  return z > Z_PAGE_CANVAS
}

/** Clamp / lift a z so it never sits at or below canvas */
export function ensureTooltipZ(z?: number | null): number {
  if (z == null || Number.isNaN(z) || z <= Z_PAGE_CANVAS) return Z_STYLED_TOOLTIP
  return Math.max(z, Z_STYLED_TOOLTIP)
}
