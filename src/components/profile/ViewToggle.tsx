'use client'

export type ProfileView = 'research' | 'panels' | 'graph'

const VIEWS: { id: ProfileView; label: string; tip: string }[] = [
  {
    id: 'research',
    label: '🔬 Research',
    tip: 'Literature, grants, trials, structures — dense of-record tables',
  },
  {
    id: 'panels',
    label: '📋 Panels',
    tip: 'Full multi-source category panels',
  },
  {
    id: 'graph',
    label: '🕸 Network',
    tip: 'Relationship graph of loaded entities',
  },
]

export function ViewToggle({
  active,
  onChange,
  disabled,
}: {
  active: ProfileView
  onChange: (v: ProfileView) => void
  disabled?: boolean
}) {
  return (
    <div
      className="inline-flex bg-slate-800 border border-slate-700 rounded-lg p-1"
      role="group"
      aria-label="Profile view"
      data-testid="profile-view-toggle"
    >
      {VIEWS.map(({ id, label, tip }) => (
        <button
          key={id}
          type="button"
          title={tip}
          onClick={() => onChange(id)}
          disabled={disabled}
          aria-pressed={active === id}
          data-testid={`profile-view-${id}`}
          className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            active === id
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
