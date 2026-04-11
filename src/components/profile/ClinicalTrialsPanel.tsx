import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { PaginatedVirtualizedList } from '@/components/ui/VirtualizedList'
import type { ClinicalTrial } from '@/lib/types'

const VIRTUALIZATION_THRESHOLD = 20

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  RECRUITING: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
  ACTIVE_NOT_RECRUITING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
  TERMINATED: 'bg-red-900/40 text-red-300 border-red-700/30',
}

function statusClass(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-slate-700 text-slate-300 border-slate-600'
}

function ClinicalTrialItem({ trial }: { trial: ClinicalTrial }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-100 text-sm">{trial.title}</p>
        <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${statusClass(trial.status)}`}>
          {trial.status}
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1">{trial.nctId} · {trial.sponsor}</p>
      <div className="flex gap-2 mt-1 flex-wrap">
        {trial.phase !== 'N/A' && (
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{trial.phase}</span>
        )}
        {trial.conditions.slice(0, 2).map((c, j) => (
          <span key={j} className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded">{c}</span>
        ))}
      </div>
      {trial.startDate && (
        <p className="text-xs text-slate-500 mt-1">Started: {trial.startDate}</p>
      )}
    </div>
  )
}

export const ClinicalTrialsPanel = memo(function ClinicalTrialsPanel({ trials, panelId, lastFetched }: { trials: ClinicalTrial[], panelId?: string, lastFetched?: Date }) {
  if (trials.length === 0) {
    return (
      <Panel title="Clinical Trials" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No clinical trials found for this molecule.</p>
      </Panel>
    )
  }

  // Use virtualization for large datasets
  if (trials.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <Panel title="Clinical Trials" panelId={panelId} lastFetched={lastFetched}>
        <PaginatedVirtualizedList
          items={trials}
          renderItem={(trial, i) => <ClinicalTrialItem key={`${trial.nctId}-${i}`} trial={trial} />}
          initialCount={10}
          estimateSize={100}
          emptyMessage="No clinical trials found for this molecule."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Clinical Trials" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {trials.map((trial, i) => (
          <ClinicalTrialItem key={`${trial.nctId}-${i}`} trial={trial} />
        ))}
      </PaginatedList>
    </Panel>
  )
})