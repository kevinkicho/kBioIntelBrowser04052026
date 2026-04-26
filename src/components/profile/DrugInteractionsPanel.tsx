import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DrugInteraction } from '@/lib/types'

const SEVERITY_STYLES: Record<string, string> = {
  high: 'bg-red-900/40 text-red-300 border-red-700/30',
  moderate: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
}

export const DrugInteractionsPanel = memo(function DrugInteractionsPanel({ interactions, panelId, lastFetched }: { interactions: DrugInteraction[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = interactions.length === 0
  return (
    <Panel
      title="Drug Interactions (RxNorm)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No drug interactions found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {interactions.map((interaction, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
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
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
