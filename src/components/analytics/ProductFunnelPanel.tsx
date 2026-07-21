'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PRODUCT_METRIC_LABELS,
  type ProductEventCount,
  type ProductMetricId,
  productEventLabel,
  readQueuedProductEvents,
  summarizeProductEvents,
  type ProductEvent,
} from '@/lib/productEvents'
import {
  computeM1FunnelFromEvents,
  funnelSnapshotToCsv,
  funnelSnapshotToJson,
  type M1FunnelSnapshot,
} from '@/lib/analytics/m1Funnel'
import { downloadFile } from '@/lib/exportData'

interface ServerCall {
  endpoint?: string
  timestamp?: string
  source?: string
  error?: string | null
}

/**
 * Product funnel panel for /analytics — local queue + optional server product source detail.
 * M1 temporal join + M3/M7 aggregates (v2.1 §5).
 */
export function ProductFunnelPanel() {
  const [localEvents, setLocalEvents] = useState<ProductEvent[]>([])
  const [serverCounts, setServerCounts] = useState<ProductEventCount[]>([])
  const [loadingServer, setLoadingServer] = useState(false)

  const refreshLocal = useCallback(() => {
    setLocalEvents(readQueuedProductEvents())
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

  const funnel: M1FunnelSnapshot = useMemo(
    () =>
      computeM1FunnelFromEvents(
        localEvents.map((e) => ({ name: e.name, ts: e.ts, props: e.props })),
        { windowDays: 7 },
      ),
    [localEvents],
  )

  const localCounts = useMemo(
    () => summarizeProductEvents(localEvents),
    [localEvents],
  )

  const rows = useMemo(() => {
    if (serverCounts.length > 0) return serverCounts
    return localCounts
  }, [serverCounts, localCounts])

  const sourceNote =
    serverCounts.length > 0
      ? 'Server (product source, last 30d sample)'
      : 'Local browser queue (this device, 7d window for M1 join)'

  const byMetric = useMemo(() => {
    const m = new Map<ProductMetricId, number>()
    for (const r of rows) {
      m.set(r.metric, (m.get(r.metric) ?? 0) + r.count)
    }
    return Array.from(m.entries())
      .filter(([id]) => id !== '—')
      .sort((a, b) => a[0].localeCompare(b[0]))
  }, [rows])

  const handleExportJson = () => {
    downloadFile(
      funnelSnapshotToJson(funnel),
      `biointel-m1-funnel-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json',
    )
  }

  const handleExportCsv = () => {
    downloadFile(
      funnelSnapshotToCsv(funnel),
      `biointel-m1-funnel-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv',
    )
  }

  return (
    <section
      className="mb-8 rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-5"
      data-testid="product-funnel-panel"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-indigo-100">Product funnel</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            M1 temporal join · M3 citation density · M7 rank ms · {sourceNote}
            {loadingServer && ' · loading server…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            Export CSV
          </button>
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
      </div>

      {/* M1 north-star strip with completedLoops — empty tiles at opacity 0.3 */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['Discover started', funnel.startedCount, 'M1'],
            ['Rank completed', funnel.rankedCount, 'M1'],
            ['Board added', funnel.boardedCount, 'M1'],
            ['Completed loops', funnel.completedLoops, 'M1'],
          ] as const
        ).map(([label, count, metric]) => {
          const empty = count == null || count === 0
          return (
            <div
              key={label}
              className={`rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 ${
                empty ? 'opacity-30' : ''
              }`}
              data-empty={empty ? 'true' : undefined}
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-indigo-400/80">
                {metric}
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {count == null ? '—' : count}
              </div>
              <div className="text-[11px] text-slate-500">{label}</div>
            </div>
          )
        })}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div
          className={`rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs ${
            !funnel.packOrRhCount ? 'opacity-30' : ''
          }`}
          data-empty={!funnel.packOrRhCount ? 'true' : undefined}
        >
          <div className="text-[10px] uppercase text-slate-500">Pack / RH events</div>
          <div className="text-lg font-semibold text-slate-100">{funnel.packOrRhCount}</div>
          <div className="text-[10px] text-slate-600">
            includes pack_exported · rate {(funnel.packOrRhRate * 100).toFixed(0)}% of board
          </div>
        </div>
        <div
          className={`rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs ${
            funnel.medianCitable == null ? 'opacity-30' : ''
          }`}
          data-empty={funnel.medianCitable == null ? 'true' : undefined}
        >
          <div className="text-[10px] uppercase text-slate-500">M3 median citable</div>
          <div className="text-lg font-semibold text-slate-100">
            {funnel.medianCitable != null ? funnel.medianCitable : '—'}
          </div>
          <div className="text-[10px] text-slate-600">
            target ≥5 · mean claims{' '}
            {funnel.meanClaimCount != null ? funnel.meanClaimCount.toFixed(1) : '—'}
          </div>
        </div>
        <div
          className={`rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs ${
            funnel.m7.p50 == null && funnel.m7.p95 == null ? 'opacity-30' : ''
          }`}
          data-empty={funnel.m7.p50 == null && funnel.m7.p95 == null ? 'true' : undefined}
        >
          <div className="text-[10px] uppercase text-slate-500">M7 shortlist (rank ms)</div>
          <div className="text-lg font-semibold text-slate-100">
            P50 {funnel.m7.p50 != null ? `${Math.round(funnel.m7.p50)}ms` : '—'} · P95{' '}
            {funnel.m7.p95 != null ? `${Math.round(funnel.m7.p95)}ms` : '—'}
          </div>
          <div className="text-[10px] text-slate-600">
            {funnel.m7.samples} samples · harvest excluded
          </div>
        </div>
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
