'use client'

import { MOLECULE_CATEGORIES, type CategoryId, type CategoryDataCount } from '@/lib/categoryConfig'
import type { FreshnessMap } from '@/lib/dataFreshness'
import { formatTimeSince } from '@/lib/dataFreshness'

interface CategoryTabBarProps {
  active: 'all' | CategoryId
  counts: Record<CategoryId, CategoryDataCount>
  onChange: (id: 'all' | CategoryId) => void
  freshness?: FreshnessMap
  disabled?: boolean
}

/**
 * Health dot: green only when loaded *with* data.
 * Empty loaded categories stay without a green “success” signal (user request).
 */
function HealthDot({
  health,
  hasData,
}: {
  health: string
  hasData: boolean
}) {
  if (health === 'loading') {
    return (
      <span
        className="w-1 h-1 rounded-full bg-amber-400 animate-pulse shrink-0"
        title="Loading…"
        data-testid="tab-health-loading"
      />
    )
  }
  if (health === 'error') {
    return (
      <span
        className="w-1 h-1 rounded-full bg-red-400 shrink-0"
        title="Failed — click to retry"
        data-testid="tab-health-error"
      />
    )
  }
  if (health === 'ok' && hasData) {
    return (
      <span
        className="w-1 h-1 rounded-full bg-emerald-400 shrink-0"
        title="Loaded with data"
        data-testid="tab-health-ok"
      />
    )
  }
  // idle, or loaded with 0 panels — no green deception
  return null
}

export function CategoryTabBar({ active, counts, onChange, freshness, disabled }: CategoryTabBarProps) {
  const totalWithData = Object.values(counts).reduce((s, c) => s + (c?.withData ?? 0), 0)
  const totalAll = Object.values(counts).reduce((s, c) => s + (c?.total ?? 0), 0)

  return (
    <div
      className="flex items-center gap-0.5 overflow-x-auto no-scrollbar border-b border-slate-800/60 pb-px"
      data-testid="category-tab-bar"
    >
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
      {MOLECULE_CATEGORIES.map((cat) => {
        const count = counts[cat.id] ?? { withData: 0, total: cat.panels.length }
        const isAct = active === cat.id
        const f = freshness?.[cat.id]
        const hasData = (count.withData ?? 0) > 0
        const title = f
          ? f.health === 'ok'
            ? hasData
              ? `Loaded ${formatTimeSince(f.fetchedAt)} · ${count.withData}/${count.total} panels with data`
              : `Loaded ${formatTimeSince(f.fetchedAt)} · no panel data`
            : f.health === 'loading'
              ? 'Loading…'
              : f.health === 'error'
                ? 'Failed — click to retry'
                : 'Not loaded yet'
          : 'Not loaded yet'

        return (
          <button
            key={cat.id}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-t-md transition-colors whitespace-nowrap ${
              isAct
                ? 'bg-slate-800/80 text-slate-100 border-b-2 border-indigo-500'
                : hasData
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/30'
            } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => onChange(cat.id)}
            disabled={disabled}
            title={title}
            data-testid={`category-tab-${cat.id}`}
            data-has-data={hasData ? 'true' : 'false'}
          >
            <span>{cat.label}</span>
            <span
              className={`text-[9px] ${hasData ? 'text-indigo-300/70' : 'text-slate-600'}`}
            >
              {count.withData}/{count.total}
            </span>
            {f && <HealthDot health={f.health} hasData={hasData} />}
          </button>
        )
      })}
    </div>
  )
}
