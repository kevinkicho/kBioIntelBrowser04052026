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

function AdverseEventItem({ event, maxCount }: { event: AdverseEvent; maxCount: number }) {
  return (
    <div className="py-2 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-sm text-slate-200 capitalize">{event.reactionName || event.reaction}</span>
        <div className="flex items-center gap-2 shrink-0">
          {event.serious > 0 && (
            <span className="text-[10px] bg-red-900/40 text-red-300 border border-red-700/30 px-1.5 py-0.5 rounded">
              {event.serious} serious
            </span>
          )}
          <span className="text-xs text-slate-400 tabular-nums font-mono">
            {event.count.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-1.5">
        <div
          className="bg-rose-500/60 h-1.5 rounded-full"
          style={{ width: `${Math.round((event.count / maxCount) * 100)}%` }}
        />
      </div>
      {(event.reportDate || event.outcome) && (
        <p className="text-[10px] text-slate-600 mt-0.5">
          {[event.reportDate && `Reported ${event.reportDate}`, event.outcome]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  )
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
      <Panel title="Adverse Events" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No adverse events found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel
      title={`Adverse Events (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
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
        getKey={(e, i) => `${e.reactionName}-${i}`}
        renderItem={(event) => <AdverseEventItem event={event} maxCount={maxCount} />}
      />
    </Panel>
  )
})
