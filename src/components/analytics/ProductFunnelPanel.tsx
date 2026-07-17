'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PRODUCT_METRIC_LABELS,
  type ProductEventCount,
  type ProductMetricId,
  productEventLabel,
  readQueuedProductEvents,
  summarizeProductEvents,
} from '@/lib/productEvents'

interface ServerCall {
  endpoint?: string
  timestamp?: string
  source?: string
}

/**
 * Product funnel panel for /analytics — local queue + optional server product source detail.
 * Labels use canonical v2 event names (post dual-emit clean-cut).
 */
export function ProductFunnelPanel() {
  const [localCounts, setLocalCounts] = useState<ProductEventCount[]>([])
  const [serverCounts, setServerCounts] = useState<ProductEventCount[]>([])
  const [loadingServer, setLoadingServer] = useState(false)

  const refreshLocal = useCallback(() => {
    setLocalCounts(summarizeProductEvents(readQueuedProductEvents()))
  }, [])

  const refreshServer = useCallback(() => {
    setLoadingServer(true)
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const params = new URLSearchParams({ view: 'detail', source: 'product', since })
    fetch(`/api/analytics/summary?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { recent_calls?: ServerCall[] } | null) => {
        if (!data?.recent_calls?.length) {
          setServerCounts([])
          return
        }
        const rows = data.recent_calls
          .filter((c) => c.endpoint)
          .map((c) => ({
            name: String(c.endpoint),
            ts: c.timestamp,
          }))
        setServerCounts(summarizeProductEvents(rows))
      })
      .catch(() => setServerCounts([]))
      .finally(() => setLoadingServer(false))
  }, [])

  useEffect(() => {
    refreshLocal()
    refreshServer()
  }, [refreshLocal, refreshServer])

  /** Prefer server aggregates when present; else local queue. */
  const rows = useMemo(() => {
    if (serverCounts.length > 0) return serverCounts
    return localCounts
  }, [serverCounts, localCounts])

  const sourceNote =
    serverCounts.length > 0
      ? 'Server (product source, last 30d sample)'
      : 'Local browser queue (this device)'

  const byMetric = useMemo(() => {
    const m = new Map<ProductMetricId, number>()
    for (const r of rows) {
      m.set(r.metric, (m.get(r.metric) ?? 0) + r.count)
    }
    return Array.from(m.entries())
      .filter(([id]) => id !== '—')
      .sort((a, b) => a[0].localeCompare(b[0]))
  }, [rows])

  const m1Loop = useMemo(() => {
    const get = (n: string) => rows.find((r) => r.name === n)?.count ?? 0
    return {
      started: get('discover_started'),
      boarded: get('board_candidate_added'),
      packOrRh: get('pack_opened') + get('research_hypothesis_opened'),
    }
  }, [rows])

  return (
    <section
      className="mb-8 rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-5"
      data-testid="product-funnel-panel"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-indigo-100">Product funnel</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Canonical discovery events (M1–M9) · {sourceNote}
            {loadingServer && ' · loading server…'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            refreshLocal()
            refreshServer()
          }}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          Refresh funnel
        </button>
      </div>

      {/* M1 north-star strip */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(
          [
            ['Discover started', m1Loop.started, 'M1'],
            ['Board candidate added', m1Loop.boarded, 'M1'],
            ['Pack / RH opened', m1Loop.packOrRh, 'M1'],
          ] as const
        ).map(([label, count, metric]) => (
          <div
            key={label}
            className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
          >
            <div className="text-[10px] font-medium uppercase tracking-wide text-indigo-400/80">
              {metric}
            </div>
            <div className="text-2xl font-bold text-slate-100">{count}</div>
            <div className="text-[11px] text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {byMetric.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {byMetric.map(([id, count]) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-[10px] text-slate-400"
              title={PRODUCT_METRIC_LABELS[id]}
            >
              <span className="font-semibold text-indigo-300">{id}</span>
              <span className="text-slate-500">{PRODUCT_METRIC_LABELS[id]}</span>
              <span className="font-mono text-slate-300">{count}</span>
            </span>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">
          No product events yet. Use Discover → board → pack to populate the funnel.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-[11px] text-slate-500">
                <th className="py-2 pr-3 font-medium">Metric</th>
                <th className="py-2 pr-3 font-medium">Event</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium text-right">Count</th>
                <th className="py-2 font-medium text-right">Last</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.name)} className="border-b border-slate-800/60">
                  <td className="py-1.5 pr-3 font-mono text-[10px] text-indigo-400">
                    {r.metric}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-200">{r.label}</td>
                  <td className="py-1.5 pr-3 font-mono text-[10px] text-slate-500">
                    {r.name}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-semibold text-slate-100">
                    {r.count}
                  </td>
                  <td className="py-1.5 text-right text-[10px] text-slate-600">
                    {r.lastAt ? new Date(r.lastAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[10px] text-slate-600">
        Labels: e.g. {productEventLabel('pack_exported')} · {productEventLabel('preference_tooltip_opened')} ·{' '}
        {productEventLabel('rubric_changed')}. Legacy dual-emit names are no longer recorded.
      </p>
    </section>
  )
}
