'use client'

import { useState } from 'react'
import { CATEGORIES, CategoryId, CategoryDataCount } from '@/lib/categoryConfig'
import type { FreshnessMap } from '@/lib/dataFreshness'
import { formatTimeSince } from '@/lib/dataFreshness'

interface CategoryTabsProps {
  active: 'all' | CategoryId
  counts: Record<CategoryId, CategoryDataCount>
  onChange: (id: 'all' | CategoryId) => void
  freshness?: FreshnessMap
}

function HealthDot({ health, tooltip }: { health: string; tooltip: string }) {
  const [show, setShow] = useState(false)
  const color =
    health === 'ok' ? 'bg-emerald-400' :
    health === 'loading' ? 'bg-amber-400 animate-pulse' :
    health === 'error' ? 'bg-red-400' :
    'bg-slate-600'

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] text-slate-200 bg-slate-800 border border-slate-700 rounded whitespace-nowrap z-50 shadow-lg">
          {tooltip}
        </span>
      )}
    </span>
  )
}

export function CategoryTabs({ active, counts, onChange, freshness }: CategoryTabsProps) {
  const totalWithData = Object.values(counts).reduce((s, c) => s + c.withData, 0)
  const totalAll = Object.values(counts).reduce((s, c) => s + c.total, 0)

  const baseClasses = 'whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors'
  const activeClasses = 'bg-indigo-600 text-white'
  const inactiveClasses = 'text-slate-400 hover:text-slate-200'

  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto pb-1">
      <button
        role="tab"
        aria-selected={active === 'all'}
        className={`${baseClasses} ${active === 'all' ? activeClasses : inactiveClasses}`}
        onClick={() => onChange('all')}
      >
        All ({totalWithData}/{totalAll})
      </button>
      {CATEGORIES.map((cat) => {
        const count = counts[cat.id]
        const isActive = active === cat.id
        const f = freshness?.[cat.id]
        const tooltip = f
          ? f.health === 'ok' ? `Loaded ${formatTimeSince(f.fetchedAt)}`
          : f.health === 'loading' ? 'Loading...'
          : f.health === 'error' ? 'Failed — click to retry'
          : 'Not loaded yet'
          : 'Not loaded yet'

        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isActive}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} flex items-center gap-1.5`}
            onClick={() => onChange(cat.id)}
          >
            {cat.icon} {cat.label} ({count.withData}/{count.total})
            {f && <HealthDot health={f.health} tooltip={tooltip} />}
          </button>
        )
      })}
    </div>
  )
}

