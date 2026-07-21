'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { DataLoadStatus, SourceFetchStatus } from '@/lib/dataStatus'
import { emitProductEvent } from '@/lib/productEvents'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

export type SourceStatusBucket = 'ok' | 'empty' | 'issue'

export interface SourceStatusCounts {
  ok: number
  empty: number
  issue: number
  total: number
}

export interface SourceStatusStripProps {
  sourceStatuses: SourceFetchStatus[]
  /** When false, skip analytics emit (tests / SSR). Default true. */
  emitEvent?: boolean
}

const BUCKET_ORDER: SourceStatusBucket[] = ['ok', 'empty', 'issue']

const BUCKET_META: Record<
  SourceStatusBucket,
  { label: string; className: string; dotClass: string }
> = {
  ok: {
    label: 'Loaded',
    className: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
    dotClass: 'bg-emerald-400',
  },
  empty: {
    label: 'Empty',
    className: 'bg-slate-800/50 text-slate-400 border-slate-600/40',
    dotClass: 'bg-slate-400',
  },
  issue: {
    label: 'Error / timeout / disabled',
    className: 'bg-amber-900/25 text-amber-300 border-amber-700/40',
    dotClass: 'bg-amber-400',
  },
}

/** Map engine DataLoadStatus → ternary bucket for the strip. */
export function bucketForStatus(status: DataLoadStatus): SourceStatusBucket {
  switch (status) {
    case 'loaded':
      return 'ok'
    case 'empty':
      return 'empty'
    case 'error':
    case 'timeout':
    case 'disabled':
    default:
      return 'issue'
  }
}

/** Aggregate ok / empty / issue counts from sourceStatuses. */
export function countSourceStatuses(statuses: SourceFetchStatus[]): SourceStatusCounts {
  const counts: SourceStatusCounts = { ok: 0, empty: 0, issue: 0, total: statuses.length }
  for (const s of statuses) {
    counts[bucketForStatus(s.status)] += 1
  }
  return counts
}

function statusDetailLabel(s: SourceFetchStatus): string {
  const base = s.source
  if (s.status === 'loaded') return base
  if (s.error) return `${base} (${s.status}: ${s.error})`
  return `${base} (${s.status})`
}

/**
 * Epistemic honesty strip for Discover results.
 * Surfaces engine sourceStatuses as ternary ok / empty / issue counts + disclaimers.
 * @see docs/design/discovery-workbench-v2.md §6.8, KD-V2-10, PR-V2-07
 */
export function SourceStatusStrip({ sourceStatuses, emitEvent = true }: SourceStatusStripProps) {
  const counts = useMemo(() => countSourceStatuses(sourceStatuses), [sourceStatuses])
  const byBucket = useMemo(() => {
    const map: Record<SourceStatusBucket, SourceFetchStatus[]> = {
      ok: [],
      empty: [],
      issue: [],
    }
    for (const s of sourceStatuses) {
      map[bucketForStatus(s.status)].push(s)
    }
    return map
  }, [sourceStatuses])
  const emittedKey = useRef<string | null>(null)

  useEffect(() => {
    if (!emitEvent || sourceStatuses.length === 0) return
    // Emit once per distinct status set shown after a successful rank.
    const key = sourceStatuses.map((s) => `${s.source}:${s.status}`).join('|')
    if (emittedKey.current === key) return
    emittedKey.current = key
    emitProductEvent('source_status_shown', {
      count: counts.total,
      ok: counts.ok,
      empty: counts.empty,
      issue: counts.issue,
    })
  }, [emitEvent, sourceStatuses, counts])

  if (sourceStatuses.length === 0) return null

  return (
    <section
      className="mb-4 rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-3"
      data-testid="source-status-strip"
      aria-label="Upstream source status"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Source status
        </h3>
        <span className="text-[10px] text-slate-600" data-testid="source-status-total">
          {counts.total} source{counts.total !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap gap-2" data-testid="source-status-counts">
        {BUCKET_ORDER.map((bucket) => {
          const n = counts[bucket]
          const meta = BUCKET_META[bucket]
          // Dim zero counts so real load/empty/issue signal stands out (summary empty-data contract)
          const dim = n === 0
          const tip =
            byBucket[bucket].length > 0
              ? byBucket[bucket].map(statusDetailLabel).join('\n')
              : undefined
          return (
            <StyledTooltip key={bucket} content={tip}>
              <span
                data-testid={`source-status-count-${bucket}`}
                data-count={n}
                data-empty={dim ? 'true' : 'false'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${meta.className} ${dim ? 'opacity-20' : ''}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden />
                {meta.label}: {n}
              </span>
            </StyledTooltip>
          )
        })}
      </div>

      {(counts.empty > 0 || counts.issue > 0) && (
        <details className="mb-2 group" data-testid="source-status-details">
          <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-400">
            View sources
          </summary>
          <ul className="mt-1.5 max-h-32 space-y-0.5 overflow-y-auto pl-1">
            {sourceStatuses.map((s) => {
              const bucket = bucketForStatus(s.status)
              const meta = BUCKET_META[bucket]
              return (
                <li
                  key={`${s.source}-${s.status}`}
                  className="flex items-start gap-1.5 text-[10px] text-slate-400"
                  data-testid="source-status-row"
                  data-source={s.source}
                  data-status={s.status}
                  data-bucket={bucket}
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotClass}`}
                    aria-hidden
                  />
                  <span className="font-mono text-slate-300">{s.source}</span>
                  <span className="text-slate-600">·</span>
                  <span>{s.status}</span>
                  {s.duration_ms != null && (
                    <span className="text-slate-600">({s.duration_ms}ms)</span>
                  )}
                  {s.error && <span className="truncate text-amber-500/80">— {s.error}</span>}
                </li>
              )
            })}
          </ul>
        </details>
      )}

      <p
        className="text-[11px] leading-relaxed text-slate-500"
        data-testid="source-status-disclaimer"
      >
        Scores are investigation priority aids, not predictions of clinical success. Empty ≠
        absence of biology; empty safety ≠ safe.
      </p>
    </section>
  )
}
