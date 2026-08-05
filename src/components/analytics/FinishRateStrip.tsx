'use client'

/**
 * Compact M1/M3/M7 finish-rate strip for home / campaign / analytics.
 * Reads solo product-event queue only (no network).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { readQueuedProductEvents } from '@/lib/productEvents'
import { computeM1FunnelFromEvents } from '@/lib/analytics/m1Funnel'

export function FinishRateStrip({
  className = '',
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const funnel = useMemo(() => {
    void tick
    const events = typeof window !== 'undefined' ? readQueuedProductEvents() : []
    return computeM1FunnelFromEvents(
      events.map((e) => ({ name: e.name, ts: e.ts, props: e.props })),
      { windowDays: 7 },
    )
  }, [tick])

  const completionPct = Math.round((funnel.completionRate || 0) * 100)
  const m3Ok = funnel.medianCitable != null && funnel.medianCitable >= 5

  return (
    <section
      className={`rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-3 sm:p-4 ${className}`}
      data-testid="finish-rate-strip"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-indigo-100">Loop finish rate (this device)</h2>
          {!compact && (
            <p className="mt-0.5 text-[10px] text-slate-500">
              M1 completed loops · M3 median citable · M7 rank P50 — solo product events (7d). Of-record
              rank stays deterministic.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
            data-testid="finish-rate-refresh"
          >
            Refresh
          </button>
          <Link
            href="/analytics"
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-indigo-300 hover:border-indigo-700"
          >
            Full funnel
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          testId="finish-rate-loops"
          label="Completed loops"
          value={String(funnel.completedLoops)}
          sub={`${completionPct}% of started · M1`}
          empty={funnel.completedLoops === 0}
        />
        <Metric
          testId="finish-rate-board"
          label="Board rate"
          value={`${Math.round((funnel.boardRate || 0) * 100)}%`}
          sub={`${funnel.boardedCount} boarded / ${funnel.rankedCount} ranked`}
          empty={funnel.rankedCount === 0}
        />
        <Metric
          testId="finish-rate-m3"
          label="M3 median citable"
          value={funnel.medianCitable != null ? String(funnel.medianCitable) : '—'}
          sub={m3Ok ? 'meets soft ≥5' : 'target ≥5 on pack export'}
          empty={funnel.medianCitable == null}
          warn={funnel.medianCitable != null && !m3Ok}
        />
        <Metric
          testId="finish-rate-m7"
          label="M7 P50 rank"
          value={funnel.m7.p50 != null ? `${Math.round(funnel.m7.p50)}ms` : '—'}
          sub={
            funnel.m7.p95 != null
              ? `P95 ${Math.round(funnel.m7.p95)}ms · n=${funnel.m7.samples}`
              : 'discover_rank_completed.ms only'
          }
          empty={funnel.m7.p50 == null}
        />
      </div>
    </section>
  )
}

function Metric({
  label,
  value,
  sub,
  empty,
  warn,
  testId,
}: {
  label: string
  value: string
  sub: string
  empty?: boolean
  warn?: boolean
  testId?: string
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        empty
          ? 'border-slate-800 bg-slate-900/40 opacity-40'
          : warn
            ? 'border-amber-900/50 bg-amber-950/20'
            : 'border-slate-800 bg-slate-900/50'
      }`}
      data-testid={testId}
      data-empty={empty ? 'true' : 'false'}
    >
      <div className="text-[9px] font-medium uppercase tracking-wide text-indigo-400/80">{label}</div>
      <div className="text-xl font-bold tabular-nums text-slate-100">{value}</div>
      <div className="text-[9px] text-slate-500">{sub}</div>
    </div>
  )
}
