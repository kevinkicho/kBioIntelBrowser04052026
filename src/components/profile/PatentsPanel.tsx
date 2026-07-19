'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { Patent } from '@/lib/types'
import { alphaSortOptions, dateSortOptions } from '@/lib/listControls'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const PatentsPanel = memo(function PatentsPanel({
  patents,
  panelId,
  lastFetched,
}: {
  patents: Patent[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(patents) ? patents : []
  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<Patent>((p) => p.filingDate || p.publicationDate, {
        newest: 'Newest filing',
        oldest: 'Oldest filing',
      }),
      ...alphaSortOptions<Patent>((p) => p.title || p.patentNumber),
      ...alphaSortOptions<Patent>((p) => p.assignee || '').map((o) => ({
        ...o,
        id: `assignee-${o.id}`,
        label: o.id.includes('asc') ? 'Assignee A–Z' : 'Assignee Z–A',
      })),
    ],
    [],
  )

  if (list.length === 0) {
    return (
      <Panel
        title="USPTO Patents"
        panelId={panelId}
        lastFetched={lastFetched}
        empty="No patents found for this molecule."
      />
    )
  }

  return (
    <Panel title={`USPTO Patents (${list.length})`} panelId={panelId} lastFetched={lastFetched}>
      <FilterablePaginatedList
        items={list}
        getSearchText={(p) =>
          [p.title, p.patentNumber, p.assignee, p.status, p.abstract].filter(Boolean).join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="date-desc"
        filterPlaceholder="Filter patents…"
        getKey={(p, i) => `${p.patentNumber}-${i}`}
        pageSize={8}
        className="space-y-0"
        renderItem={(patent, index) => {
          const href = patent.patentNumber
            ? `https://patents.google.com/patent/${encodeURIComponent(patent.patentNumber)}`
            : null
          const date = patent.filingDate || patent.publicationDate || ''
          const row = (
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.7fr)_minmax(0,0.9fr)_4.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-100 group-hover:text-cyan-200 truncate">
                  {patent.title || '—'}
                </div>
                {patent.abstract && (
                  <div className="text-[10px] text-slate-600 line-clamp-1">{patent.abstract}</div>
                )}
              </div>
              <span className="text-[10px] font-mono text-cyan-300/90 truncate">
                {patent.patentNumber || '—'}
              </span>
              <span className="text-[11px] text-slate-500 truncate" title={patent.assignee}>
                {patent.assignee || '—'}
              </span>
              <span
                className={`text-[11px] text-slate-500 tabular-nums truncate ${emptyDataClass(isEmptyMetric(date))}`}
              >
                {date || '—'}
              </span>
            </div>
          )
          return (
            <div>
              {index === 0 && (
                <div
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.7fr)_minmax(0,0.9fr)_4.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                  role="row"
                >
                  <span>Title</span>
                  <span>Number</span>
                  <span>Assignee</span>
                  <span>Date</span>
                </div>
              )}
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    onDeepLinkClick('patents', href, {
                      panelId: 'patents',
                      label: patent.patentNumber,
                    })
                  }
                >
                  {row}
                </a>
              ) : (
                row
              )}
            </div>
          )
        }}
      />
    </Panel>
  )
})
