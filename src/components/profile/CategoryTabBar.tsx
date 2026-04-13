'use client'

import { CATEGORIES, CategoryId, CategoryDataCount } from '@/lib/categoryConfig'
import type { FreshnessMap } from '@/lib/dataFreshness'
import { formatTimeSince } from '@/lib/dataFreshness'

interface CategoryTabBarProps {
  active: 'all' | CategoryId
  counts: Record<CategoryId, CategoryDataCount>
  onChange: (id: 'all' | CategoryId) => void
  freshness?: FreshnessMap
  disabled?: boolean
}

function HealthDot({ health }: { health: string }) {
  const color =
    health === 'ok' ? 'bg-emerald-400' :
    health === 'loading' ? 'bg-amber-400 animate-pulse' :
    health === 'error' ? 'bg-red-400' :
    'bg-slate-600'
  return <span className={`w-1 h-1 rounded-full ${color} shrink-0`} />
}

export function CategoryTabBar({ active, counts, onChange, freshness, disabled }: CategoryTabBarProps) {
  const totalWithData = Object.values(counts).reduce((s, c) => s + c.withData, 0)
  const totalAll = Object.values(counts).reduce((s, c) => s + c.total, 0)

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar border-b border-slate-800/60 pb-px">
      <button
        className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-t-md transition-colors ${
          active === 'all'
            ? 'bg-slate-800/80 text-indigo-300 border-b-2 border-indigo-500'
            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => onChange('all')}
        disabled={disabled}
      >
        All <span className="text-[9px] text-slate-500">{totalWithData}/{totalAll}</span>
      </button>
      {CATEGORIES.map(cat => {
        const count = counts[cat.id]
        const isAct = active === cat.id
        const f = freshness?.[cat.id]

        return (
          <button
            key={cat.id}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-t-md transition-colors whitespace-nowrap ${
              isAct
                ? 'bg-slate-800/80 text-slate-100 border-b-2 border-indigo-500'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
            } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => onChange(cat.id)}
            disabled={disabled}
            title={f ? (f.health === 'ok' ? `Loaded ${formatTimeSince(f.fetchedAt)}` : f.health === 'loading' ? 'Loading...' : f.health === 'error' ? 'Failed — click to retry' : '') : ''}
          >
            <span>{cat.label}</span>
            <span className={`text-[9px] ${count.withData > 0 ? 'text-indigo-300/70' : 'text-slate-600'}`}>
              {count.withData}/{count.total}
            </span>
            {f && <HealthDot health={f.health} />}
          </button>
        )
      })}
    </div>
  )
}