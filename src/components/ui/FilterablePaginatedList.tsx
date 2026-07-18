'use client'

/**
 * Filter + sort toolbar over a paginated list of typed items.
 * Use for all profile panel listviews so users can scan large result sets.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { PaginatedList } from '@/components/ui/PaginatedList'
import {
  applyFilterSort,
  type ListSortOption,
} from '@/lib/listControls'

export interface FilterablePaginatedListProps<T> {
  items: T[]
  /** Free-text haystack for the filter box */
  getSearchText: (item: T) => string
  sortOptions: ListSortOption<T>[]
  /** Default sort id (e.g. date-desc for timestamped data) */
  defaultSortId?: string
  renderItem: (item: T, index: number) => ReactNode
  pageSize?: number
  className?: string
  filterPlaceholder?: string
  /** Optional stable key for React list */
  getKey?: (item: T, index: number) => string | number
  emptyMessage?: string
}

export function FilterablePaginatedList<T>({
  items,
  getSearchText,
  sortOptions,
  defaultSortId,
  renderItem,
  pageSize = 5,
  className,
  filterPlaceholder = 'Filter list…',
  getKey,
  emptyMessage = 'No matching items.',
}: FilterablePaginatedListProps<T>) {
  const initialSort =
    defaultSortId && sortOptions.some((s) => s.id === defaultSortId)
      ? defaultSortId
      : sortOptions[0]?.id ?? 'name-asc'

  const [query, setQuery] = useState('')
  const [sortId, setSortId] = useState(initialSort)

  const filtered = useMemo(
    () =>
      applyFilterSort(items, {
        query,
        getSearchText,
        sortId,
        sortOptions,
      }),
    [items, query, getSearchText, sortId, sortOptions],
  )

  const showToolbar = items.length > 0

  return (
    <div className={className}>
      {showToolbar && (
        <div
          className="mb-2 flex flex-wrap items-center gap-2"
          data-testid="list-filter-sort"
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={filterPlaceholder}
            className="min-w-[10rem] flex-1 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none"
            data-testid="list-filter-input"
            aria-label="Filter list"
          />
          {sortOptions.length > 0 && (
            <label className="flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0">
              <span className="sr-only sm:not-sr-only">Sort</span>
              <select
                value={sortId}
                onChange={(e) => setSortId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-600 focus:outline-none max-w-[11rem]"
                data-testid="list-sort-select"
                aria-label="Sort list"
              >
                {sortOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="text-[10px] text-slate-600 tabular-nums shrink-0">
            {filtered.length === items.length
              ? `${items.length}`
              : `${filtered.length}/${items.length}`}
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm py-2" data-testid="list-filter-empty">
          {items.length === 0 ? emptyMessage : 'No items match this filter.'}
        </p>
      ) : (
        <PaginatedList pageSize={pageSize} className={className}>
          {filtered.map((item, i) => (
            <div key={getKey ? getKey(item, i) : i}>{renderItem(item, i)}</div>
          ))}
        </PaginatedList>
      )}
    </div>
  )
}
