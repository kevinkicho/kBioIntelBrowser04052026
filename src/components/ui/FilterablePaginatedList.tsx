'use client'

/**
 * Filter + sort toolbar over a paginated list of typed items.
 * Optional CSV export and column-visibility toggles for dense tables.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { PaginatedList } from '@/components/ui/PaginatedList'
import {
  applyFilterSort,
  type ListSortOption,
} from '@/lib/listControls'
import { downloadCsv, rowsToCsv } from '@/lib/listCsv'

export interface CsvColumn<T> {
  header: string
  get: (item: T) => unknown
}

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
  /** When set, show Export CSV for filtered rows */
  csvExport?: {
    filename: string
    columns: CsvColumn<T>[]
  }
  /**
   * Optional column visibility toggles. Keys are opaque ids; parent reads
   * `visibleColumns` via render prop or external state if needed later.
   * For now: toggles are local and passed to renderItem via data attribute only
   * if parent uses the `columnVisibility` keys for conditional cells.
   */
  columnVisibility?: {
    columns: { id: string; label: string; defaultVisible?: boolean }[]
    /** Parent can re-render cells based on Set of visible ids */
    renderItemWithColumns?: (item: T, index: number, visible: Set<string>) => ReactNode
  }
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
  csvExport,
  columnVisibility,
}: FilterablePaginatedListProps<T>) {
  const initialSort =
    defaultSortId && sortOptions.some((s) => s.id === defaultSortId)
      ? defaultSortId
      : sortOptions[0]?.id ?? 'name-asc'

  const [query, setQuery] = useState('')
  const [sortId, setSortId] = useState(initialSort)
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const c of columnVisibility?.columns ?? []) {
      if (c.defaultVisible !== false) s.add(c.id)
    }
    return s
  })
  const [colsOpen, setColsOpen] = useState(false)

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

  function handleExport() {
    if (!csvExport) return
    const headers = csvExport.columns.map((c) => c.header)
    const rows = filtered.map((item) => csvExport.columns.map((c) => c.get(item)))
    downloadCsv(csvExport.filename, rowsToCsv(headers, rows))
  }

  function toggleCol(id: string) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size <= 1) return next
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const render =
    columnVisibility?.renderItemWithColumns != null
      ? (item: T, i: number) => columnVisibility.renderItemWithColumns!(item, i, visibleCols)
      : renderItem

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
          {columnVisibility && columnVisibility.columns.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setColsOpen((o) => !o)}
                className="rounded-lg border border-slate-700 px-2 py-1.5 text-[10px] text-slate-400 hover:text-slate-200"
                data-testid="list-columns-toggle"
              >
                Columns
              </button>
              {colsOpen && (
                <div className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl">
                  {columnVisibility.columns.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 py-0.5 text-[11px] text-slate-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.has(c.id)}
                        onChange={() => toggleCol(c.id)}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {csvExport && (
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-slate-700 px-2 py-1.5 text-[10px] text-slate-400 hover:text-indigo-300 hover:border-indigo-700/50 shrink-0"
              data-testid="list-export-csv"
              title="Download filtered rows as CSV"
            >
              Export CSV
            </button>
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
            <div key={getKey ? getKey(item, i) : i}>{render(item, i)}</div>
          ))}
        </PaginatedList>
      )}
    </div>
  )
}
