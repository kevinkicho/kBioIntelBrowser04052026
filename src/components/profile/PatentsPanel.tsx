'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { Patent } from '@/lib/types'
import { alphaSortOptions, dateSortOptions } from '@/lib/listControls'

function PatentItem({ patent }: { patent: Patent }) {
  const href = patent.patentNumber
    ? `https://patents.google.com/patent/${encodeURIComponent(patent.patentNumber)}`
    : undefined
  return (
    <div className="py-2 border-b border-slate-700/60 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-100 text-sm hover:text-cyan-300"
            >
              {patent.title}
            </a>
          ) : (
            <p className="font-semibold text-slate-100 text-sm">{patent.title}</p>
          )}
          <p className="text-[11px] text-slate-500 mt-0.5">
            {[patent.assignee, patent.status].filter(Boolean).join(' · ')}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {[
              patent.filingDate && `Filed ${patent.filingDate}`,
              patent.publicationDate && `Pub ${patent.publicationDate}`,
              patent.expirationDate && `Exp ${patent.expirationDate}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {patent.abstract && (
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{patent.abstract}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-[10px] font-mono bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-1.5 py-0.5 rounded">
            {patent.patentNumber}
          </span>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-cyan-400 hover:text-cyan-300"
            >
              Patent ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

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
      <Panel title="USPTO Patents" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No patents found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel
      title={`USPTO Patents (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
    >
      <FilterablePaginatedList
        items={list}
        getSearchText={(p) =>
          [p.title, p.patentNumber, p.assignee, p.status, p.abstract, p.filingDate]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="date-desc"
        filterPlaceholder="Filter patents (title, number, assignee…)"
        getKey={(p, i) => `${p.patentNumber}-${i}`}
        renderItem={(patent) => <PatentItem patent={patent} />}
      />
    </Panel>
  )
})
