import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { PharosTarget } from '@/lib/types'

function tdlBadgeColor(tdl: string): string {
  if (tdl === 'Tclin') return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30'
  if (tdl === 'Tchem') return 'bg-blue-900/40 text-blue-300 border-blue-700/30'
  if (tdl === 'Tbio') return 'bg-amber-900/40 text-amber-300 border-amber-700/30'
  return 'bg-slate-700/60 text-slate-300 border-slate-600/40'
}

export const PharosPanel = memo(function PharosPanel({ targets, panelId, lastFetched }: { targets: PharosTarget[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = targets.length === 0
  return (
    <Panel
      title="Pharos Target Development"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No Pharos target data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {targets.map((target, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${tdlBadgeColor(target.tdl)}`}>
                  {target.tdl}
                </span>
                {target.family && (
                  <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded shrink-0">
                    {target.family}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-200 mt-1">{target.name}</p>
              {target.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{target.description}</p>
              )}
              {target.novelty && target.novelty > 0 && (
                <p className="text-xs text-slate-500 mt-1">Novelty: {target.novelty.toFixed(1)}</p>
              )}
              <a href={target.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
                View in Pharos →
              </a>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
