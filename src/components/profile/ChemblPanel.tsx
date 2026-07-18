'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { ChemblActivity } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

const ASSAY_TYPE_LABELS: Record<string, string> = {
  B: 'Binding',
  F: 'Functional',
  A: 'ADMET',
  T: 'Toxicity',
  P: 'Physicochemical',
}

function ChemblActivityItem({ activity }: { activity: ChemblActivity }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-100 text-sm">{activity.targetName}</p>
        <span className="text-xs bg-teal-900/40 text-teal-300 border border-teal-700/30 px-2 py-0.5 rounded shrink-0">
          {activity.activityType}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-sm text-slate-300">
          {activity.activityValue} {activity.activityUnits}
        </span>
        <span className="text-xs text-slate-500">
          {ASSAY_TYPE_LABELS[activity.assayType] ?? activity.assayType}
        </span>
      </div>
    </div>
  )
}

export const ChemblPanel = memo(function ChemblPanel({
  activities,
  panelId,
  lastFetched,
}: {
  activities: ChemblActivity[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(activities) ? activities : []
  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<ChemblActivity>((a) => a.activityValue ?? a.pchemblValue ?? 0, {
        high: 'Highest activity',
        low: 'Lowest activity',
        idPrefix: 'activity',
      }),
      ...alphaSortOptions<ChemblActivity>((a) => a.targetName || a.activityType),
    ],
    [],
  )

  if (list.length === 0) {
    return (
      <Panel title="Bioactivity (ChEMBL)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No bioactivity data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel
      title={`Bioactivity (ChEMBL) (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
    >
      <FilterablePaginatedList
        items={list}
        getSearchText={(a) =>
          [
            a.targetName,
            a.activityType,
            a.assayType,
            a.chemblId,
            String(a.activityValue),
            a.activityUnits,
          ]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="activity-desc"
        filterPlaceholder="Filter activities (target, type…)"
        getKey={(a, i) => `${a.targetName}-${a.activityType}-${i}`}
        className="space-y-3"
        renderItem={(activity) => <ChemblActivityItem activity={activity} />}
      />
    </Panel>
  )
})
