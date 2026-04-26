import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { PharmacologyTarget } from '@/lib/types'

function typeBadgeClass(type: string): string {
  const lower = type.toLowerCase()
  if (lower.includes('agonist') && !lower.includes('antagonist')) {
    return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30'
  }
  if (lower.includes('antagonist')) {
    return 'bg-rose-900/40 text-rose-300 border-rose-700/30'
  }
  if (lower.includes('inhibitor')) {
    return 'bg-amber-900/40 text-amber-300 border-amber-700/30'
  }
  return 'bg-slate-700/40 text-slate-300 border-slate-600/30'
}

export const IupharPanel = memo(function IupharPanel({ targets, panelId, lastFetched }: { targets: PharmacologyTarget[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = targets.length === 0
  return (
    <Panel
      title="Pharmacology Targets (IUPHAR)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No pharmacology targets found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {targets.map((target, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <a
                  href={target.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-100 text-sm hover:text-sky-400 transition-colors"
                >
                  {target.targetName}
                </a>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {target.primaryTarget && (
                    <span className="text-xs bg-sky-900/40 text-sky-300 border border-sky-700/30 px-2 py-0.5 rounded">
                      Primary Target
                    </span>
                  )}
                  {target.type && (
                    <span className={`text-xs border px-2 py-0.5 rounded ${typeBadgeClass(target.type)}`}>
                      {target.type}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {target.affinity && (
                  <span className="text-sm text-slate-300">{target.affinity}</span>
                )}
                <span className="text-xs text-slate-500">{target.species}</span>
              </div>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
