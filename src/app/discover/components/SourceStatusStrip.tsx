'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { DataLoadStatus, SourceFetchStatus } from '@/lib/dataStatus'
import { emitProductEvent } from '@/lib/productEvents'
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { originSourceDeepLink } from '@/lib/originDeepLinks'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { emptyDataClass } from '@/lib/summaryEmpty'

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
  /** Disease context for registry deep links on source names */
  diseaseName?: string | null
}

const BUCKET_ORDER: SourceStatusBucket[] = ['ok', 'empty', 'issue']

const BUCKET_META: Record<
  SourceStatusBucket,
  { label: string; className: string; dotClass: string; meaning: string }
> = {
  ok: {
    label: 'Loaded',
    className: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
    dotClass: 'bg-emerald-400',
    meaning: 'Free public API returned usable data for this rank step.',
  },
  empty: {
    label: 'Empty',
    className: 'bg-slate-800/50 text-slate-400 border-slate-600/40',
    dotClass: 'bg-slate-400',
    meaning: 'API responded but no rows for this disease/query — not proof of “no biology”.',
  },
  issue: {
    label: 'Error / timeout / disabled',
    className: 'bg-amber-900/25 text-amber-300 border-amber-700/40',
    dotClass: 'bg-amber-400',
    meaning: 'Upstream failed, timed out, or is disabled — shortlist may be thinner.',
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

function formatMs(ms: number | undefined): string | null {
  if (ms == null || Number.isNaN(ms)) return null
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`
}

/**
 * Epistemic honesty strip for Discover results.
 * Surfaces engine sourceStatuses as ternary ok / empty / issue counts + disclaimers.
 * @see docs/design/discovery-workbench-v2.md §6.8, KD-V2-10, PR-V2-07
 */
export function SourceStatusStrip({
  sourceStatuses,
  emitEvent = true,
  diseaseName = null,
}: SourceStatusStripProps) {
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

  const sorted = useMemo(() => {
    const order: Record<SourceStatusBucket, number> = { issue: 0, empty: 1, ok: 2 }
    return [...sourceStatuses].sort(
      (a, b) =>
        order[bucketForStatus(a.status)] - order[bucketForStatus(b.status)] ||
        a.source.localeCompare(b.source),
    )
  }, [sourceStatuses])

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
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
          <h3 className="text-[11px] font-semibold text-slate-200">
            Upstream APIs for this rank
          </h3>
          <HelperTip
            content="Did each free public gather step load, return empty, or fail? Open a source name for its registry. Molecule-level hits are in Source honesty below. Scores are investigation priority aids, not predictions of clinical success. Empty ≠ absence of biology; empty safety ≠ safe."
            label="About upstream API status"
            testId="source-status-help"
            maxWidth="20rem"
          />
        </div>
        <span className="text-[10px] text-slate-600 tabular-nums" data-testid="source-status-total">
          {counts.total} source{counts.total !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap gap-2" data-testid="source-status-counts">
        {BUCKET_ORDER.map((bucket) => {
          const n = counts[bucket]
          const meta = BUCKET_META[bucket]
          const dim = n === 0
          const tip =
            `${meta.meaning}\n` +
            (byBucket[bucket].length > 0
              ? byBucket[bucket].map(statusDetailLabel).join('\n')
              : '(none)')
          return (
            <StyledTooltip key={bucket} content={tip}>
              <span
                data-testid={`source-status-count-${bucket}`}
                data-count={n}
                data-empty={dim ? 'true' : 'false'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${meta.className} ${emptyDataClass(dim)}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden />
                {meta.label}: {n}
              </span>
            </StyledTooltip>
          )
        })}
      </div>

      <details className="mb-2 group" data-testid="source-status-details" open={counts.issue > 0 || counts.empty > 0}>
        <summary className="cursor-pointer text-[11px] text-slate-400 hover:text-slate-300">
          {counts.issue > 0 || counts.empty > 0
            ? 'Sources (issues & empties expanded)'
            : 'All sources'}
        </summary>
        <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto pl-0.5">
          {sorted.map((s) => {
            const bucket = bucketForStatus(s.status)
            const meta = BUCKET_META[bucket]
            const link = originSourceDeepLink(s.source, {
              diseaseName: diseaseName ?? undefined,
              name: diseaseName ?? undefined,
            })
            const ms = formatMs(s.duration_ms)
            return (
              <li
                key={`${s.source}-${s.status}-${s.duration_ms ?? ''}`}
                className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-400"
                data-testid="source-status-row"
                data-source={s.source}
                data-status={s.status}
                data-bucket={bucket}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotClass}`}
                  aria-hidden
                />
                {link.href ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-300 hover:underline"
                    title={link.title}
                    onClick={() =>
                      onDeepLinkClick(s.source, link.href, {
                        label: s.source,
                        panelId: 'discover-source-status',
                      })
                    }
                  >
                    {s.source}
                  </a>
                ) : (
                  <span className="font-medium text-slate-300">{s.source}</span>
                )}
                <span className="text-slate-600">·</span>
                <span className={bucket === 'ok' ? 'text-emerald-400/90' : bucket === 'issue' ? 'text-amber-300/90' : 'text-slate-500'}>
                  {s.status}
                </span>
                {ms && <span className="tabular-nums text-slate-600">({ms})</span>}
                {s.error && (
                  <span className="max-w-full truncate text-amber-500/80">— {s.error}</span>
                )}
              </li>
            )
          })}
        </ul>
      </details>

      {/* Disclaimer lives in HelperTip above (source-status-help) to reduce strip clutter */}
      <span className="sr-only" data-testid="source-status-disclaimer">
        Scores are investigation priority aids, not predictions of clinical success. Empty ≠
        absence of biology; empty safety ≠ safe.
      </span>
    </section>
  )
}
