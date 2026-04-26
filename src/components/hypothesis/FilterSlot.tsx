'use client'

import { AXES, getAxis } from '@/lib/hypothesis/axes'
import type { Filter, FilterAxis } from '@/lib/hypothesis/types'

interface Props {
  index: number
  filter: Filter
  onChange: (filter: Filter) => void
  onRemove?: () => void
  disabled?: boolean
}

const PHASE_OPTIONS = [
  { value: '1', label: 'Phase 1' },
  { value: '2', label: 'Phase 2' },
  { value: '3', label: 'Phase 3' },
  { value: '4', label: 'Phase 4' },
]

export function FilterSlot({ index, filter, onChange, onRemove, disabled }: Props) {
  const axis = getAxis(filter.axis)
  const isPhase = axis?.valueKind === 'phase'

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Filter {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <div className="sm:col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">
            Axis
          </label>
          <select
            value={filter.axis}
            onChange={e => onChange({ axis: e.target.value as FilterAxis, value: '' })}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            {AXES.map(a => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">
            Value
          </label>
          {isPhase ? (
            <select
              value={filter.value}
              onChange={e => onChange({ ...filter, value: e.target.value })}
              disabled={disabled}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">Select phase…</option>
              {PHASE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={filter.value}
              onChange={e => onChange({ ...filter, value: e.target.value })}
              placeholder={axis?.placeholder ?? ''}
              disabled={disabled}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
          )}
        </div>
      </div>

      {axis?.description && (
        <p className="mt-2 text-[11px] text-slate-500">{axis.description}</p>
      )}
    </div>
  )
}
