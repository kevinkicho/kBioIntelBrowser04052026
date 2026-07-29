'use client'

/**
 * Fetch state for /analytics dashboard (operator metrics over free-API traffic).
 * Matches existing /api/analytics/summary views used by the page.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  apiName,
  type ApiSummary,
  type CategoryGroup,
  type DailySnapshot,
  type ApiMetricRow,
  type ApiDetail,
  type ViewMode,
  type LayoutMode,
} from '@/components/analytics/analyticsPageUi'

export function useAnalyticsDashboard() {
  const [view, setView] = useState<ViewMode>('summary')
  const [layout, setLayout] = useState<LayoutMode>('grouped')
  const [since, setSince] = useState('7d')
  const [filter, setFilter] = useState('')
  const [categories, setCategories] = useState<CategoryGroup[]>([])
  const [flatApis, setFlatApis] = useState<ApiSummary[]>([])
  const [trend, setTrend] = useState<DailySnapshot[]>([])
  const [errors, setErrors] = useState<ApiMetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [detailSource, setDetailSource] = useState<string | null>(null)
  const [detail, setDetail] = useState<ApiDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const sinceParam =
    since === '7d'
      ? new Date(Date.now() - 7 * 86400000).toISOString()
      : since === '30d'
        ? new Date(Date.now() - 30 * 86400000).toISOString()
        : since === '90d'
          ? new Date(Date.now() - 90 * 86400000).toISOString()
          : undefined

  const fetchData = useCallback(() => {
    setLoading(true)
    const sp = sinceParam
    const params = new URLSearchParams({ since: sp || '' })
    if (view === 'summary') {
      const catParams = new URLSearchParams(params)
      catParams.set('view', 'categorized')
      fetch(`/api/analytics/summary?${catParams}`)
        .then((r) => r.json())
        .then((data: CategoryGroup[]) => {
          setCategories(data)
          setFlatApis(
            data
              .flatMap((c) => c.apis)
              .sort((a, b) => apiName(a.source).localeCompare(apiName(b.source))),
          )
          setExpanded(new Set(data.map((c) => c.id)))
        })
        .catch(() => {
          /* ignore */
        })
        .finally(() => setLoading(false))
    } else if (view === 'trend') {
      params.set('view', 'trend')
      fetch(`/api/analytics/summary?${params}`)
        .then((r) => r.json())
        .then(setTrend)
        .catch(() => {
          /* ignore */
        })
        .finally(() => setLoading(false))
    } else if (view === 'errors') {
      params.set('view', 'errors')
      fetch(`/api/analytics/summary?${params}`)
        .then((r) => r.json())
        .then(setErrors)
        .catch(() => {
          /* ignore */
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [view, sinceParam])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openDetail = useCallback(
    (source: string) => {
      setDetailSource(source)
      setDetailLoading(true)
      setDetail(null)
      const params = new URLSearchParams({
        view: 'detail',
        source,
        since: sinceParam || '',
      })
      fetch(`/api/analytics/summary?${params}`)
        .then((r) => r.json())
        .then((data: ApiDetail) => setDetail(data))
        .catch(() => setDetail(null))
        .finally(() => setDetailLoading(false))
    },
    [sinceParam],
  )

  const closeDetail = useCallback(() => {
    setDetailSource(null)
    setDetail(null)
  }, [])

  function toggleCategory(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return {
    view,
    setView,
    layout,
    setLayout,
    since,
    setSince,
    filter,
    setFilter,
    categories,
    flatApis,
    trend,
    errors,
    loading,
    expanded,
    detailSource,
    detail,
    detailLoading,
    fetchData,
    openDetail,
    closeDetail,
    toggleCategory,
  }
}
