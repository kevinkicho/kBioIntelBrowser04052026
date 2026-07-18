'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { BioAssayResult } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

function outcomeBadgeClass(outcome: string): string {
  switch (outcome) {
    case 'Active':
      return 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/30'
    case 'Inactive':
      return 'bg-slate-700/60 text-slate-300 border border-slate-600/30'
    default:
      return 'bg-amber-900/40 text-amber-300 border border-amber-700/30'
  }
}

function BioAssayItem({ assay }: { assay: BioAssayResult }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${outcomeBadgeClass(assay.outcome)}`}>
            {assay.outcome}
          </span>
          <p className="font-semibold text-slate-100 text-sm truncate">{assay.assayName}</p>
        </div>
        <a
          href={assay.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
        >
          PubChem →
        </a>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-400">
        {assay.targetName && <span>Target: {assay.targetName}</span>}
        {assay.activityValue != null && assay.activityValue > 0 && (
          <span>Activity: {assay.activityValue}</span>
        )}
      </div>
    </div>
  )
}

export const BioAssayPanel = memo(function BioAssayPanel({
  assays,
  panelId,
  lastFetched,
}: {
  assays: BioAssayResult[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(assays) ? assays : []
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<BioAssayResult>((a) => a.assayName || a.assayId),
      ...numberSortOptions<BioAssayResult>((a) => a.activityValue ?? 0, {
        high: 'Highest activity',
        low: 'Lowest activity',
        idPrefix: 'activity',
      }),
    ],
    [],
  )

  if (list.length === 0) {
    return (
      <Panel title="PubChem BioAssay" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No bioassay data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel
      title={`PubChem BioAssay (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
    >
      <FilterablePaginatedList
        items={list}
        getSearchText={(a) =>
          [a.assayName, a.assayId, a.outcome, a.targetName, a.description, a.type]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="name-asc"
        filterPlaceholder="Filter assays (name, target, outcome…)"
        getKey={(a, i) => `${a.assayName}-${i}`}
        className="space-y-3"
        renderItem={(assay) => <BioAssayItem assay={assay} />}
      />
    </Panel>
  )
})
