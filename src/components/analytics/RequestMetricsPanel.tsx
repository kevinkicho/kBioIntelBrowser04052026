'use client'

/**
 * Operator panel: live browser request gates + recent clientFetch outcomes.
 * Local ring buffer only — not of-record science data.
 */

import { useEffect, useState } from 'react'
import {
  clearRequestMetrics,
  snapshotRequestMetrics,
  subscribeRequestMetrics,
  type RequestMetricsSnapshot,
} from '@/lib/pipeline/requestMetrics'
import { loadLocalFunnel } from '@/lib/analytics/localFunnel'
import { HelperTip } from '@/components/ui/HelperTip'

function kindTone(kind: string): string {
  switch (kind) {
    case 'fetch_resource':
    case 'pressure':
      return 'text-amber-300'
    case 'fetch_err':
      return 'text-red-300'
    case 'pipeline':
      return 'text-indigo-300'
    default:
      return 'text-slate-300'
  }
}

export function RequestMetricsPanel({ className = '' }: { className?: string }) {
  const [snap, setSnap] = useState<RequestMetricsSnapshot>(() => snapshotRequestMetrics())
  const [rankCompletes, setRankCompletes] = useState(0)

  useEffect(() => {
    const refresh = () => {
      setSnap(snapshotRequestMetrics())
      try {
        const funnel = loadLocalFunnel()
        // M7 uses discover_rank_completed.ms only (not harvest) — count shows loop volume
        setRankCompletes(
          typeof funnel.discover_rank_completed === 'number' ? funnel.discover_rank_completed : 0,
        )
      } catch {
        /* ignore */
      }
    }
    refresh()
    const unsub = subscribeRequestMetrics(refresh)
    const t = window.setInterval(refresh, 2000)
    return () => {
      unsub()
      window.clearInterval(t)
    }
  }, [])

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/40 p-4 ${className}`}
      data-testid="request-metrics-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-slate-100">Request health (this tab)</h2>
          <HelperTip
            content="Local operator metrics only: browser fetch gate, category stampede queue, and recent clientFetch outcomes. Not product ranking. Clears on refresh."
            label="About request metrics"
          />
        </div>
        <button
          type="button"
          className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
          data-testid="request-metrics-clear"
          onClick={() => clearRequestMetrics()}
        >
          Clear
        </button>
      </div>

      {snap.resourcePressure && (
        <p
          className="mb-3 rounded border border-amber-800/50 bg-amber-950/30 px-2 py-1.5 text-[11px] text-amber-200"
          data-testid="request-metrics-pressure"
        >
          Resource pressure cool-down active — analytics deferred so Discover rank can recover.
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Rank completes"
          value={String(rankCompletes)}
          sub="M7: rank ms only (not harvest)"
          testId="request-metrics-rank-m7"
        />
        <Stat
          label="Browser gate"
          value={`${snap.browserGate.inFlight}/${snap.browserGate.max}`}
          sub={`${snap.browserGate.waiting} waiting`}
          testId="request-metrics-browser-gate"
        />
        <Stat
          label="Category gate"
          value={`${snap.categoryGate.inFlight}/${snap.categoryGate.max}`}
          sub={`${snap.categoryGate.waiting} waiting`}
          testId="request-metrics-category-gate"
        />
        <Stat
          label="OK fetches"
          value={String(snap.counts.fetch)}
          sub={`${snap.counts.fetch_err} err · ${snap.counts.fetch_resource} resource`}
          testId="request-metrics-fetch-counts"
        />
        <Stat
          label="Pressure events"
          value={String(snap.counts.pressure)}
          sub="cool-downs marked"
          testId="request-metrics-pressure-count"
        />
      </div>

      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        Recent events
      </p>
      <ul
        className="max-h-48 space-y-0.5 overflow-y-auto font-mono text-[10px]"
        data-testid="request-metrics-list"
      >
        {snap.recent.length === 0 && (
          <li className="text-slate-600">No clientFetch activity yet in this tab.</li>
        )}
        {snap.recent.map((e, i) => (
          <li key={`${e.ts}-${i}`} className={`flex flex-wrap gap-x-2 ${kindTone(e.kind)}`}>
            <span className="text-slate-600">
              {new Date(e.ts).toLocaleTimeString()}
            </span>
            <span className="uppercase text-slate-500">{e.kind}</span>
            <span className="min-w-0 flex-1 truncate text-slate-400">{e.label}</span>
            {e.ms != null && <span className="text-slate-600">{e.ms}ms</span>}
            {e.status != null && <span className="text-slate-600">{e.status}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[9px] text-slate-600">
        Snapshot {snap.at} · free public APIs · not clinical decision support
      </p>
    </section>
  )
}

function Stat({
  label,
  value,
  sub,
  testId,
}: {
  label: string
  value: string
  sub: string
  testId: string
}) {
  return (
    <div
      className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-2.5 py-2"
      data-testid={testId}
    >
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-slate-100">{value}</p>
      <p className="text-[9px] text-slate-600">{sub}</p>
    </div>
  )
}
