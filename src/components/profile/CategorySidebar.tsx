'use client'

import { useState } from 'react'
import { CATEGORIES, CategoryId, CategoryDataCount } from '@/lib/categoryConfig'
import type { FreshnessMap } from '@/lib/dataFreshness'
import { formatTimeSince } from '@/lib/dataFreshness'

interface CategorySidebarProps {
  active: 'all' | CategoryId
  counts: Record<CategoryId, CategoryDataCount>
  onChange: (id: 'all' | CategoryId) => void
  freshness?: FreshnessMap
}

function HealthIndicator({ health, tooltip }: { health: string; tooltip: string }) {
  const color =
    health === 'ok' ? 'bg-emerald-400' :
    health === 'loading' ? 'bg-amber-400 animate-pulse' :
    health === 'error' ? 'bg-red-400' :
    'bg-slate-600'

  return (
    <span className="relative group">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] text-slate-200 bg-slate-800 border border-slate-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        {tooltip}
      </span>
    </span>
  )
}

export function CategorySidebar({ active, counts, onChange, freshness }: CategorySidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const totalWithData = Object.values(counts).reduce((s, c) => s + c.withData, 0)
  const totalAll = Object.values(counts).reduce((s, c) => s + c.total, 0)

  const baseItemClasses = 'flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-left w-full'
  const activeClasses = 'bg-indigo-600 text-white'
  const inactiveClasses = 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 cursor-pointer'

  return (
    <div className={`flex flex-col h-fit bg-slate-900/30 border border-slate-800 rounded-xl transition-all duration-200 ${collapsed ? 'w-14' : 'w-52'}`}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-2 border-b border-slate-800/50">
        {!collapsed && (
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
            Categories
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto py-1.5">
        {/* All categories item */}
        <button
          className={`${baseItemClasses} ${active === 'all' ? activeClasses : inactiveClasses} mb-0.5`}
          onClick={() => onChange('all')}
          title={collapsed ? `All (${totalWithData}/${totalAll})` : undefined}
        >
          <span className="text-base">📊</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-xs font-medium">All</span>
              <span className="text-[10px] bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
                {totalWithData}/{totalAll}
              </span>
            </>
          )}
        </button>

        {/* Category items */}
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
           const hasData = count.withData > 0

           return (
             <a
               key={cat.id}
               href={`#${cat.id}`}
               className={`${baseItemClasses} ${isActive ? activeClasses : inactiveClasses}`}
               onClick={(e) => {
                 e.preventDefault()
                 onChange(cat.id)
               }}
               title={collapsed ? `${cat.icon} ${cat.label} (${count.withData}/${count.total})` : undefined}
             >
               <span className="text-base">{cat.icon}</span>
               {!collapsed && (
                 <>
                   <span className="flex-1 text-xs font-medium truncate">{cat.label}</span>
                   <span className={`text-[10px] px-1.5 py-0.5 rounded ${hasData ? 'bg-indigo-900/30 text-indigo-300' : 'bg-slate-800/50 text-slate-500'}`}>
                     {count.withData}/{count.total}
                   </span>
                   {f && <HealthIndicator health={f.health} tooltip={tooltip} />}
                 </>
               )}
             </a>
           )
        })}
      </nav>

      {/* Collapse hint at bottom */}
      {collapsed && (
        <div className="px-2 py-1.5 text-center text-[9px] text-slate-600 border-t border-slate-800/50">
          ◀ expand
        </div>
      )}
    </div>
  )
}