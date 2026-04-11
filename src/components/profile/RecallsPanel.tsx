import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DrugRecall } from '@/lib/types'

const classificationColors: Record<string, string> = {
  'Class I': 'bg-red-900/40 text-red-300 border-red-700/30',
  'Class II': 'bg-amber-900/40 text-amber-300 border-amber-700/30',
  'Class III': 'bg-slate-700/40 text-slate-300 border-slate-600/30',
}

export const RecallsPanel = memo(function RecallsPanel({ recalls, panelId, lastFetched }: { recalls: DrugRecall[], panelId?: string, lastFetched?: Date }) {
  if (recalls.length === 0) {
    return (
      <Panel title="FDA Drug Recalls" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No recalls found for this molecule in the past 2 years.</p>
      </Panel>
    )
  }

  return (
    <Panel title="FDA Drug Recalls" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {recalls.map((recall, i) => {
          const colors = classificationColors[recall.classification] ?? classificationColors['Class III']
          return (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
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
        })}
      </PaginatedList>
    </Panel>
  )
})
