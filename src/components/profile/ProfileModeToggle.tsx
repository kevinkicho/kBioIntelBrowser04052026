'use client'

import type { ProfileMode } from '@/lib/profileMode'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

interface Props {
  active: ProfileMode
  onChange: (mode: ProfileMode) => void
  disabled?: boolean
}

/**
 * Decision profile vs full browser — not ViewToggle (panels/graph).
 * @see docs/design/discovery-workbench-v1.md §4.3
 */
export function ProfileModeToggle({ active, onChange, disabled }: Props) {
  return (
    <div
      className="inline-flex bg-slate-800 border border-slate-700 rounded-lg p-0.5"
      role="group"
      aria-label="Profile mode"
      data-testid="profile-mode-toggle"
    >
      {(
        [
          {
            id: 'decision' as const,
            label: 'Decision',
            tip: 'Decision profile: Core six panels + scores/claims strip',
          },
          {
            id: 'full' as const,
            label: 'Full',
            tip: 'Full browser: all categories and panels',
          },
        ] as const
      ).map(({ id, label, tip }) => (
        <StyledTooltip key={id} content={tip}>
          <button
            type="button"
            onClick={() => onChange(id)}
            disabled={disabled}
            aria-pressed={active === id}
            aria-label={tip}
            data-testid={`profile-mode-${id}`}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              active === id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        </StyledTooltip>
      ))}
    </div>
  )
}
