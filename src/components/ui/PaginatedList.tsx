'use client'

import { useState } from 'react'

interface PaginatedListProps {
  children: React.ReactNode[]
  pageSize?: number
  className?: string
  /** Server-side pagination: callback to fetch more data */
  onLoadMore?: () => Promise<void>
  /** Server-side pagination: whether more data exists on server */
  hasMore?: boolean
  /** Server-side pagination: loading state */
  isLoadingMore?: boolean
  /** Total count for display (useful when server returns total count) */
  totalCount?: number
}

export function PaginatedList({
  children,
  pageSize = 5,
  className,
  onLoadMore,
  hasMore: serverHasMore,
  isLoadingMore = false,
  totalCount,
}: PaginatedListProps) {
  const total = totalCount ?? children.length
  const [visibleCount, setVisibleCount] = useState(pageSize)

  // For client-side pagination (no onLoadMore callback)
  const clientHasMore = visibleCount < children.length
  // For server-side pagination
  const hasMore = serverHasMore ?? clientHasMore

  const handleShowMore = async () => {
    if (onLoadMore) {
      // Server-side pagination: fetch more from API
      await onLoadMore()
      setVisibleCount((prev) => prev + pageSize)
    } else {
      // Client-side pagination: just show more from existing data
      setVisibleCount((prev) => Math.min(prev + pageSize, children.length))
    }
  }

  const handleShowAll = () => {
    if (onLoadMore) {
      // For server pagination, show all loaded items
      setVisibleCount(children.length)
    } else {
      setVisibleCount(children.length)
    }
  }

  return (
    <div className={className}>
      {children.slice(0, visibleCount)}
      {(total > pageSize || hasMore) && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
          <span className="text-xs text-slate-500">
            {isLoadingMore ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading more...
              </span>
            ) : (
              `Showing ${Math.min(visibleCount, children.length)}${total > children.length ? ` of ${children.length} loaded` : ''}`
            )}
            {total > children.length && !isLoadingMore && (
              <span className="text-slate-600"> (total: {total})</span>
            )}
          </span>
          {hasMore && !isLoadingMore && (
            <div className="flex gap-3">
              <button
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                onClick={handleShowMore}
                disabled={isLoadingMore}
              >
                {onLoadMore ? 'Load more' : 'Show more'}
              </button>
              {!onLoadMore && children.length > pageSize && (
                <button
                  className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
                  onClick={handleShowAll}
                >
                  Show all ({children.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}