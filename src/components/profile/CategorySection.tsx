'use client'

import { useEffect, useState } from 'react'
import type { CategoryId } from '@/lib/categoryConfig'
import {
  isCategoryLoading,
  useProfilePanelContext,
} from '@/components/profile/ProfilePanelContext'

interface CategorySectionProps {
  icon: string
  label: string
  withData: number
  total: number
  defaultCollapsed?: boolean
  /**
   * When true (focused tab), force the section open so scroll targets the
   * category title + panels, not a collapsed header.
   */
  forceExpanded?: boolean
  /** When set, show one category-level refresh (all cards share the same multi-source fetch). */
  categoryId?: CategoryId
  children: React.ReactNode
}

export function CategorySection({
  icon,
  label,
  withData,
  total,
  defaultCollapsed = false,
  forceExpanded = false,
  categoryId,
  children,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed && !forceExpanded)
  const profileCtx = useProfilePanelContext()

  useEffect(() => {
    if (forceExpanded) setCollapsed(false)
  }, [forceExpanded])

  const hasData = withData > 0
  const headerTextClass = hasData ? 'text-slate-200' : 'text-slate-500'
  const badgeClass = hasData
    ? 'bg-indigo-900/50 text-indigo-300'
    : 'bg-slate-800 text-slate-500'

  const refreshing =
    categoryId && profileCtx
      ? isCategoryLoading(profileCtx.loadingCategories, categoryId)
      : false
  const canRefresh = Boolean(categoryId && profileCtx?.refreshCategory)
  const isCollapsed = forceExpanded ? false : collapsed

  return (
    <div>
      <div
        className={`flex items-center gap-2 w-full ${headerTextClass}`}
        data-category-title={label}
      >
        <button
          type="button"
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          onClick={() => {
            if (forceExpanded) return
            setCollapsed((c) => !c)
          }}
          aria-expanded={!isCollapsed}
        >
          <span>{icon}</span>
          <span className="font-semibold text-sm uppercase tracking-wider">{label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
            {withData}/{total}
          </span>
          <span
            className={`ml-auto text-xs transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          >
            ▼
          </span>
        </button>
        {canRefresh && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              profileCtx!.refreshCategory(categoryId!)
            }}
            disabled={Boolean(refreshing)}
            className="shrink-0 rounded p-1.5 text-slate-500 hover:bg-slate-700/60 hover:text-amber-300 transition-colors disabled:opacity-40"
            title={`Refresh ${label} (re-query all sources in this category)`}
            aria-label={`Refresh ${label}`}
            data-testid={
              categoryId ? `category-refresh-${categoryId}` : 'category-refresh'
            }
          >
            <svg
              className={`h-4 w-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>
      {!isCollapsed && (
        // Children own their own layout (panel grid + optional status strip).
        // Do not put banners and cards in one CSS grid row — that stretches empty
        // "Source status" strips to panel height and creates large blank regions.
        <div className="mt-3 space-y-3">{children}</div>
      )}
    </div>
  )
}
