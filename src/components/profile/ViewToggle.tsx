'use client'

type View = 'panels' | 'graph'

export function ViewToggle({ active, onChange, disabled }: { active: View; onChange: (v: View) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex bg-slate-800 border border-slate-700 rounded-lg p-1">
      {(['panels', 'graph'] as View[]).map(view => (
        <button
          key={view}
          onClick={() => onChange(view)}
          disabled={disabled}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize disabled:opacity-50 disabled:cursor-not-allowed ${
            active === view
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {view === 'panels' ? '📋 Panels' : '🕸 Network'}
        </button>
      ))}
    </div>
  )
}