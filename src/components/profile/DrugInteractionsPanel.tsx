'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { DrugInteraction } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

const SEVERITY_STYLES: Record<string, string> = {
  high: 'bg-red-900/40 text-red-300 border-red-700/30',
  moderate: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
}

const SEVERITY_RANK: Record<string, number> = {
  contraindicated: 4,
  major: 3,
  high: 3,
  moderate: 2,
  minor: 1,
  'n/a': 0,
}

export const DrugInteractionsPanel = memo(function DrugInteractionsPanel({ interactions, panelId, lastFetched }: { interactions: DrugInteraction[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = interactions.length === 0
  const sortOptions = useMemo(
    () => [
      {
        id: 'severity-desc',
        label: 'Severity high→low',
        compare: (a: DrugInteraction, b: DrugInteraction) =>
          (SEVERITY_RANK[String(b.severity).toLowerCase()] ?? 0) -
          (SEVERITY_RANK[String(a.severity).toLowerCase()] ?? 0),
      },
      {
        id: 'severity-asc',
        label: 'Severity low→high',
        compare: (a: DrugInteraction, b: DrugInteraction) =>
          (SEVERITY_RANK[String(a.severity).toLowerCase()] ?? 0) -
          (SEVERITY_RANK[String(b.severity).toLowerCase()] ?? 0),
      },
      ...alphaSortOptions<DrugInteraction>((x) => x.drugName || ''),
    ],
    [],
  )

  return (
    <Panel
      title="Drug Interactions (RxNorm)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No drug interactions found for this molecule." : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={interactions}
          getSearchText={(interaction) =>
            [interaction.drugName, interaction.severity, interaction.description]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="severity-desc"
          filterPlaceholder="Filter interactions…"
          getKey={(_, i) => i}
          pageSize={5}
          className="space-y-3"
          renderItem={(interaction) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">{interaction.drugName}</p>
                <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${
                  SEVERITY_STYLES[interaction.severity] ?? 'bg-slate-800 text-slate-400 border-slate-600'
                }`}>
                  {interaction.severity}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{interaction.description}</p>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
