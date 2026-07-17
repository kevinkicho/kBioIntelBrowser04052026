'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type SearchHistoryEntry,
  type SearchHistoryFilter,
  type SearchHistorySort,
  type SearchHistoryUiState,
  clearSearchHistory,
  readHistoryUi,
  readSearchHistory,
  removeSearchHistory,
  sortAndFilterHistory,
  writeHistoryUi,
  DEFAULT_HISTORY_UI,
} from '@/lib/searchHistory'

export function useSearchHistory() {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([])
  const [ui, setUi] = useState<SearchHistoryUiState>(DEFAULT_HISTORY_UI)
  const [hydrated, setHydrated] = useState(false)

  const reload = useCallback(() => {
    setEntries(readSearchHistory())
    setUi(readHistoryUi())
  }, [])

  useEffect(() => {
    reload()
    setHydrated(true)
    const onChange = () => reload()
    window.addEventListener('biointel-search-history', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('biointel-search-history', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [reload])

  const visible = useMemo(
    () =>
      sortAndFilterHistory(entries, {
        sort: ui.sort,
        filter: ui.filter,
        query: ui.query,
      }),
    [entries, ui.sort, ui.filter, ui.query],
  )

  const patchUi = useCallback((patch: Partial<SearchHistoryUiState>) => {
    setUi(writeHistoryUi(patch))
  }, [])

  const remove = useCallback((id: string) => {
    removeSearchHistory(id)
    setEntries(readSearchHistory())
  }, [])

  const clear = useCallback(() => {
    clearSearchHistory()
    setEntries([])
  }, [])

  const setSort = useCallback(
    (sort: SearchHistorySort) => patchUi({ sort }),
    [patchUi],
  )
  const setFilter = useCallback(
    (filter: SearchHistoryFilter) => patchUi({ filter }),
    [patchUi],
  )
  const setQuery = useCallback(
    (query: string) => patchUi({ query }),
    [patchUi],
  )
  const setCollapsed = useCallback(
    (collapsed: boolean) => patchUi({ collapsed }),
    [patchUi],
  )

  return {
    hydrated,
    entries,
    visible,
    ui,
    setSort,
    setFilter,
    setQuery,
    setCollapsed,
    remove,
    clear,
    reload,
  }
}
