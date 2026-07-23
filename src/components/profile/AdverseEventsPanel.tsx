'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { AdverseEvent } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import {
  faersApiLinkTitle,
  faersEvidenceApiUrl,
  faersRowDeepLink,
  faersSearchTitle,
} from '@/lib/faersLinks'

export const AdverseEventsPanel = memo(function AdverseEventsPanel({
  adverseEvents,
  panelId,
  lastFetched,
  moleculeName,
}: {
  adverseEvents: AdverseEvent[]
  panelId?: string
  lastFetched?: Date
  /** Molecule name for openFDA drug+reaction deep links */
  moleculeName?: string
}) {
  const list = useMemo(
    () => (Array.isArray(adverseEvents) ? adverseEvents : []),
    [adverseEvents],
  )
  const maxCount = useMemo(() => Math.max(...list.map((e) => e.count), 1), [list])
  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<AdverseEvent>((e) => e.count, {
        high: 'Most reports',
        low: 'Fewest reports',
      }),
      ...numberSortOptions<AdverseEvent>((e) => e.serious, {
        high: 'Most serious',
        low: 'Least serious',
      }).map((o) => ({ ...o, id: `serious-${o.id}` })),
      ...dateSortOptions<AdverseEvent>((e) => e.reportDate, {
        newest: 'Newest report',
        oldest: 'Oldest report',
      }),
      ...alphaSortOptions<AdverseEvent>((e) => e.reactionName || e.reaction || ''),
    ],
    [],
  )

  if (list.length === 0) {
    return (
      <Panel
        title="Adverse Events"
        panelId={panelId}
        lastFetched={lastFetched}
        empty="No adverse events found for this molecule."
      />
    )
  }

  return (
    <Panel
      title={`Adverse Events (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      help="openFDA FAERS reaction counts (reporting counts, not incidence). Row opens the FDA FAERS Public Dashboard; use API for the exact openFDA JSON query (± this drug)."
    >
      <FilterablePaginatedList
        items={list}
        getSearchText={(e) =>
          [e.reactionName, e.reaction, e.outcome, e.reportDate, e.drugName]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="num-desc"
        filterPlaceholder="Filter reactions…"
        getKey={(e, i) => `${e.reactionName || e.reaction || 'ae'}-${i}`}
        pageSize={8}
        className="space-y-0"
        renderItem={(event, index) => {
          const name = event.reactionName || event.reaction || '—'
          const drug = event.drugName || moleculeName || ''
          const href = faersRowDeepLink({
            reactionName: event.reactionName,
            reaction: event.reaction,
            drugName: event.drugName,
            moleculeName,
          })
          const apiHref = faersEvidenceApiUrl({
            reactionName: event.reactionName,
            reaction: event.reaction,
            drugName: event.drugName,
            moleculeName,
          })
          const pct = Math.round((event.count / maxCount) * 100)
          const seriousEmpty = isEmptyMetric(event.serious)
          const linkTitle = faersSearchTitle(name === '—' ? '' : name, drug)
          const apiTitle = faersApiLinkTitle(name === '—' ? '' : name, drug)
          return (
            <div>
              {index === 0 && (
                <div
                  className="grid grid-cols-[minmax(0,1.3fr)_4rem_4rem_minmax(4rem,0.8fr)_2.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                  role="row"
                >
                  <span>Reaction</span>
                  <span className="text-right">Count</span>
                  <span className="text-right">Serious</span>
                  <span>Share</span>
                  <span className="text-right">API</span>
                </div>
              )}
              <div className="grid grid-cols-[minmax(0,1.3fr)_4rem_4rem_minmax(4rem,0.8fr)_2.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group">
                <StyledTooltip content={linkTitle} className="min-w-0">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`ae-row-${name}`}
                    onClick={() =>
                      onDeepLinkClick('faers', href, { panelId: 'adverse-events', label: name })
                    }
                    className="text-sm text-slate-100 capitalize truncate group-hover:text-rose-200 min-w-0 block"
                  >
                    {name}
                  </a>
                </StyledTooltip>
                <span className="text-xs font-mono tabular-nums text-slate-300 text-right">
                  {event.count.toLocaleString()}
                </span>
                <span
                  className={`text-xs tabular-nums text-right ${
                    seriousEmpty ? emptyDataClass(true) : 'text-red-300'
                  }`}
                >
                  {seriousEmpty ? '—' : event.serious}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex-1 bg-slate-700/50 rounded-full h-1.5 min-w-[2rem]">
                    <div
                      className="bg-rose-500/60 h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 tabular-nums w-7 text-right">
                    {pct}%
                  </span>
                </div>
                <StyledTooltip content={apiTitle}>
                  <a
                    href={apiHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`ae-api-${name}`}
                    onClick={() =>
                      onDeepLinkClick('faers', apiHref, {
                        panelId: 'adverse-events',
                        label: `api:${name}`,
                      })
                    }
                    className="text-[10px] text-slate-500 hover:text-cyan-300 text-right shrink-0"
                    aria-label={apiTitle}
                  >
                    API
                  </a>
                </StyledTooltip>
              </div>
            </div>
          )
        }}
      />
    </Panel>
  )
})
