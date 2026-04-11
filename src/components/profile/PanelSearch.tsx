'use client'

interface PanelSearchProps {
  value: string
  onChange: (value: string) => void
}

export function PanelSearch({ value, onChange }: PanelSearchProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search panels..."
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
      />
      {value && (
        <button
          aria-label="clear search"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-sm"
        >
          ✕
        </button>
      )}
    </div>
  )
}
