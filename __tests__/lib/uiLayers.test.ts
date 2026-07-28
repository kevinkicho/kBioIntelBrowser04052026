import {
  ensureTooltipZ,
  isAboveCanvasZ,
  STYLED_TOOLTIP_Z,
  Z_PAGE_CANVAS,
  styledTooltipPanelStyle,
} from '@/lib/uiLayers'

describe('uiLayers', () => {
  it('tooltip z is strictly above page canvas', () => {
    expect(STYLED_TOOLTIP_Z).toBeGreaterThan(Z_PAGE_CANVAS)
    expect(isAboveCanvasZ(STYLED_TOOLTIP_Z)).toBe(true)
    expect(isAboveCanvasZ(Z_PAGE_CANVAS)).toBe(false)
  })

  it('ensureTooltipZ never returns at or below canvas', () => {
    expect(ensureTooltipZ(0)).toBe(STYLED_TOOLTIP_Z)
    expect(ensureTooltipZ(-1)).toBe(STYLED_TOOLTIP_Z)
    expect(ensureTooltipZ(null)).toBe(STYLED_TOOLTIP_Z)
    expect(ensureTooltipZ(40)).toBe(STYLED_TOOLTIP_Z)
    expect(ensureTooltipZ(STYLED_TOOLTIP_Z + 1)).toBe(STYLED_TOOLTIP_Z + 1)
  })

  it('styledTooltipPanelStyle uses fixed + tooltip z', () => {
    const s = styledTooltipPanelStyle({ top: 10 })
    expect(s.position).toBe('fixed')
    expect(s.zIndex).toBe(STYLED_TOOLTIP_Z)
    expect(s.top).toBe(10)
    expect(isAboveCanvasZ(s.zIndex as number)).toBe(true)
  })
})
