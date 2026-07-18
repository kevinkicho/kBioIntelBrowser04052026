'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { DrugLabel } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
} from '@/lib/listControls'

export const DailyMedPanel = memo(function DailyMedPanel({ labels, panelId, lastFetched }: { labels: DrugLabel[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = labels.length === 0
  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<DrugLabel>((l) => l.publishedDate || l.date, {
        newest: 'Newest published',
        oldest: 'Oldest published',
      }),
      ...alphaSortOptions<DrugLabel>((l) => l.title || ''),
      ...alphaSortOptions<DrugLabel>((l) => l.labelerName || '').map((o) => ({
        ...o,
        id: `labeler-${o.id}`,
        label: o.id === 'name-asc' ? 'Labeler A–Z' : 'Labeler Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="Drug Labels (DailyMed)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No drug label found for this molecule." : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={labels}
          getSearchText={(label) =>
            [
              label.title,
              label.labelerName,
              label.dosageForm,
              label.route,
              label.publishedDate,
              label.date,
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="date-desc"
          filterPlaceholder="Filter labels…"
          getKey={(label, i) => label.setId || i}
          pageSize={5}
          className="space-y-3"
          renderItem={(label) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <a href={label.dailyMedUrl} target="_blank" rel="noopener noreferrer"
                className="font-semibold text-blue-400 hover:text-blue-300 text-sm">
                {label.title}
              </a>
              {label.labelerName && <p className="text-xs text-slate-400 mt-1">{label.labelerName}</p>}
              <div className="flex items-center gap-3 mt-1">
                {label.dosageForm && <span className="text-xs text-slate-500">{label.dosageForm}</span>}
                {label.route && <span className="text-xs text-slate-500">{label.route}</span>}
                {label.publishedDate && <span className="text-xs text-slate-500">{label.publishedDate}</span>}
              </div>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
