'use client'

import { useState } from 'react'

interface CategorySectionProps {
  icon: string
  label: string
  withData: number
  total: number
  defaultCollapsed?: boolean
  children: React.ReactNode
}

export function CategorySection({
  icon,
  label,
  withData,
  total,
  defaultCollapsed = false,
  children,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const hasData = withData > 0
  const headerTextClass = hasData ? 'text-slate-200' : 'text-slate-500'
  const badgeClass = hasData
    ? 'bg-indigo-900/50 text-indigo-300'
    : 'bg-slate-800 text-slate-500'

  return (
    <div>
      <button
        className={`flex items-center gap-2 w-full ${headerTextClass}`}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span>{icon}</span>
        <span className="font-semibold text-sm uppercase tracking-wider">
          {label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
          {withData}/{total}
        </span>
        <span
          className={`ml-auto text-xs transition-transform ${
            collapsed ? '-rotate-90' : ''
          }`}
        >
          ▼
        </span>
      </button>
      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
          {children}
        </div>
      )}
    </div>
  )
}
