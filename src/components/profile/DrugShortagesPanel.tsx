import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DrugShortage } from '@/lib/types'

function shortageStatusBadge(status: string): string {
  const lower = status.toLowerCase()
  if (lower === 'shortage') return 'bg-red-900/40 text-red-300 border-red-700/30'
  if (lower === 'resolved') return 'bg-green-900/40 text-green-300 border-green-700/30'
  if (lower === 'ongoing') return 'bg-amber-900/40 text-amber-300 border-amber-700/30'
  return 'bg-slate-700/60 text-slate-300 border-slate-600/40'
}

export const DrugShortagesPanel = memo(function DrugShortagesPanel({ shortages, panelId, lastFetched }: { shortages: DrugShortage[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = shortages.length === 0
  return (
    <Panel
      title="FDA Drug Shortages"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No drug shortages found." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {shortages.map((shortage, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${shortageStatusBadge(shortage.shortageStatus)}`}>
                  {shortage.shortageStatus}
                </span>
              </div>
              <p className="font-semibold text-slate-100 text-sm mt-1">{shortage.drugName}</p>
              {shortage.genericName && (
                <p className="text-xs text-slate-400 mt-0.5">{shortage.genericName}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Company: {shortage.company}</p>
              {shortage.shortageReason && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{shortage.shortageReason}</p>
              )}
              {shortage.estimatedResupplyDate && (
                <p className="text-xs text-amber-400 mt-1">Est. resupply: {shortage.estimatedResupplyDate}</p>
              )}
              <a
                href={shortage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                View on FDA →
              </a>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
