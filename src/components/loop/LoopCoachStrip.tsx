'use client'

/**
 * Next-step coach for north-star loop completion (M1 finish rate).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { readQueuedProductEvents } from '@/lib/productEvents'
import { nextLoopCoachAdvice } from '@/lib/loop/loopCoach'

export function LoopCoachStrip({ className = '' }: { className?: string }) {
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const advice = useMemo(() => {
    void tick
    const events =
      typeof window !== 'undefined'
        ? readQueuedProductEvents().map((e) => ({
            name: e.name,
            ts: e.ts,
            props: e.props,
          }))
        : []
    return nextLoopCoachAdvice(events)
  }, [tick])

  return (
    <section
      className={`rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3 sm:p-4 ${className}`}
      data-testid="loop-coach-strip"
      data-step={advice.stepId}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-emerald-100">Loop coach</h2>
            <span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[9px] font-medium tabular-nums text-emerald-300/90">
              {advice.progressPct}% toward Monday handoff
            </span>
          </div>
          <p className="mt-1 text-[12px] font-medium text-slate-200">{advice.title}</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{advice.why}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
          >
            Refresh
          </button>
          <Link
            href={advice.href}
            data-testid="loop-coach-cta"
            className="rounded-lg border border-emerald-700/60 bg-emerald-900/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-800/50"
          >
            {advice.cta}
          </Link>
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-600/80 transition-all"
          style={{ width: `${advice.progressPct}%` }}
        />
      </div>
    </section>
  )
}
