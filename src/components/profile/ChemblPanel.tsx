import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { PaginatedVirtualizedList } from '@/components/ui/VirtualizedList'
import type { ChemblActivity } from '@/lib/types'

const VIRTUALIZATION_THRESHOLD = 20

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
        <span className="text-sm text-slate-300">{activity.activityValue} {activity.activityUnits}</span>
        <span className="text-xs text-slate-500">
          {ASSAY_TYPE_LABELS[activity.assayType] ?? activity.assayType}
        </span>
      </div>
    </div>
  )
}

export const ChemblPanel = memo(function ChemblPanel({ activities, panelId, lastFetched }: { activities: ChemblActivity[], panelId?: string, lastFetched?: Date }) {
  if (activities.length === 0) {
    return (
      <Panel title="Bioactivity (ChEMBL)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No bioactivity data found for this molecule.</p>
      </Panel>
    )
  }

  // Use virtualization for large datasets
  if (activities.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <Panel title="Bioactivity (ChEMBL)" panelId={panelId} lastFetched={lastFetched}>
        <PaginatedVirtualizedList
          items={activities}
          renderItem={(activity, i) => <ChemblActivityItem key={`${activity.targetName}-${activity.activityType}-${i}`} activity={activity} />}
          initialCount={10}
          estimateSize={80}
          emptyMessage="No bioactivity data found for this molecule."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Bioactivity (ChEMBL)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {activities.map((activity, i) => (
          <ChemblActivityItem key={`${activity.targetName}-${activity.activityType}-${i}`} activity={activity} />
        ))}
      </PaginatedList>
    </Panel>
  )
})