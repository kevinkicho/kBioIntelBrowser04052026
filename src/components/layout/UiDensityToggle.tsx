'use client'

import { useUiDensity } from '@/hooks/useUiDensity'
import { UI_DENSITY_LABELS, type UiDensity } from '@/lib/uiDensity'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

/**
 * Compact comfortable | dense control for helper-text density.
 */
export function UiDensityToggle() {
  const { density, setDensity } = useUiDensity()

  const tip =
    density === 'comfortable'
      ? 'Comfortable: short previews + tooltips. Switch to Dense for labels-only.'
      : 'Dense: titles and (i) tips only. Switch to Comfortable for short previews.'

  return (
    <StyledTooltip content={tip} side="top" align="left">
      <div
        className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-950/90 p-0.5 text-[10px] shadow-lg backdrop-blur-sm"
        role="group"
        aria-label="UI density"
        data-testid="ui-density-toggle"
      >
        {(['comfortable', 'dense'] as UiDensity[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setDensity(mode)}
            aria-pressed={density === mode}
            className={`rounded-full px-2 py-0.5 font-medium transition-colors ${
              density === mode
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            data-testid={`ui-density-${mode}`}
          >
            {UI_DENSITY_LABELS[mode]}
          </button>
        ))}
      </div>
    </StyledTooltip>
  )
}
