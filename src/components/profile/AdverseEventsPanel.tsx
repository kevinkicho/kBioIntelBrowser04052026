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

function faersHref(event: AdverseEvent): string {
  const term = event.reactionName || event.reaction || event.drugName || ''
  if (!term) return 'https://open.fda.gov/apis/drug/event/'
  return `https://open.fda.gov/apis/drug/event/?search=patient.reaction.reactionmeddrapt:"${encodeURIComponent(term)}"`
}

export const AdverseEventsPanel = memo(function AdverseEventsPanel({
  adverseEvents,
  panelId,
  lastFetched,
}: {
  adverseEvents: AdverseEvent[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(adverseEvents) ? adverseEvents : []
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
    <Panel title={`Adverse Events (${list.length})`} panelId={panelId} lastFetched={lastFetched}>
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
        getKey={(e, i) => `${e.reactionName}-${i}`}
        pageSize={8}
        className="space-y-0"
        renderItem={(event, index) => {
          const name = event.reactionName || event.reaction || '—'
          const href = faersHref(event)
          const pct = Math.round((event.count / maxCount) * 100)
          const seriousEmpty = isEmptyMetric(event.serious)
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
                  <span className="text-right">Open</span>
                </div>
              )}
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title="Explore openFDA drug event API"
                onClick={() =>
                  onDeepLinkClick('faers', href, { panelId: 'adverse-events', label: name })
                }
                className="grid grid-cols-[minmax(0,1.3fr)_4rem_4rem_minmax(4rem,0.8fr)_2.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
              >
                <span className="text-sm text-slate-100 capitalize truncate group-hover:text-rose-200">
                  {name}
                </span>
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
                <span className="text-xs text-indigo-400 group-hover:text-indigo-300 text-right">
                  ↗
                </span>
              </a>
            </div>
          )
        }}
      />
    </Panel>
  )
})
