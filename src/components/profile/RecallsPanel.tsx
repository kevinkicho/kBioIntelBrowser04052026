'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { DrugRecall } from '@/lib/types'
import { alphaSortOptions, dateSortOptions } from '@/lib/listControls'

const classificationColors: Record<string, string> = {
  'Class I': 'bg-red-900/40 text-red-300 border-red-700/30',
  'Class II': 'bg-amber-900/40 text-amber-300 border-amber-700/30',
  'Class III': 'bg-slate-700/40 text-slate-300 border-slate-600/30',
}

export const RecallsPanel = memo(function RecallsPanel({ recalls, panelId, lastFetched }: { recalls: DrugRecall[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(recalls) ? recalls : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<DrugRecall>((r) => r.reportDate, {
        newest: 'Newest report',
        oldest: 'Oldest report',
      }),
      ...alphaSortOptions<DrugRecall>((r) => r.classification || '').map((o) => ({
        ...o,
        id: `class-${o.id}`,
        label: o.id.includes('asc') ? 'Class A–Z' : 'Class Z–A',
      })),
      ...alphaSortOptions<DrugRecall>((r) => r.reason || r.recallingFirm || ''),
    ],
    [],
  )

  return (
    <Panel
      title="FDA Drug Recalls"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No recalls found for this molecule in the past 2 years.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(recall) =>
            [
              recall.reason,
              recall.classification,
              recall.recallingFirm,
              recall.reportDate,
              recall.city,
              recall.state,
              recall.status,
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="date-desc"
          filterPlaceholder="Filter recalls (reason, firm, class…)"
          getKey={(recall, i) => `${recall.reportDate}-${recall.reason}-${i}`}
          renderItem={(recall) => {
            const colors = classificationColors[recall.classification] ?? classificationColors['Class III']
            return (
              <div className="py-3 border-b border-slate-700 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-100 text-sm">{recall.reason}</p>
                  <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${colors}`}>
                    {recall.classification}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{recall.recallingFirm}</p>
                <div className="flex items-center gap-3 mt-1">
                  {recall.reportDate && <span className="text-xs text-slate-500">{recall.reportDate}</span>}
                  {recall.city && recall.state && (
                    <span className="text-xs text-slate-500">{recall.city}, {recall.state}</span>
                  )}
                  <span className="text-xs text-slate-600">{recall.status}</span>
                </div>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
