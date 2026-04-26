import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DrugLabel } from '@/lib/types'

export const DailyMedPanel = memo(function DailyMedPanel({ labels, panelId, lastFetched }: { labels: DrugLabel[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = labels.length === 0
  return (
    <Panel
      title="Drug Labels (DailyMed)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No drug label found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {labels.map((label, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
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
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
