import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { BindingAffinity } from '@/lib/types'

const AFFINITY_TYPE_COLORS: Record<string, string> = {
  Ki:   'bg-violet-900/40 text-violet-300 border-violet-700/30',
  Kd:   'bg-blue-900/40 text-blue-300 border-blue-700/30',
  IC50: 'bg-orange-900/40 text-orange-300 border-orange-700/30',
  EC50: 'bg-teal-900/40 text-teal-300 border-teal-700/30',
}

function affinityBadgeClass(type: string): string {
  return AFFINITY_TYPE_COLORS[type] ?? 'bg-slate-700/40 text-slate-300 border-slate-600/30'
}

export const BindingDbPanel = memo(function BindingDbPanel({ affinities, panelId, lastFetched }: { affinities: BindingAffinity[], panelId?: string, lastFetched?: Date }) {
  if (affinities.length === 0) {
    return (
      <Panel title="Binding Affinities (BindingDB)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No binding affinity data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Binding Affinities (BindingDB)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {affinities.map((aff, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-100 text-sm">{aff.targetName}</p>
              <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${affinityBadgeClass(aff.affinityType)}`}>
                {aff.affinityType}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-300">
                {aff.affinityValue} {aff.affinityUnits}
              </span>
              {aff.source && (
                <span className="text-xs text-slate-500 truncate">{aff.source}</span>
              )}
              {aff.doi && (
                <a
                  href={`https://doi.org/${aff.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors ml-auto shrink-0"
                >
                  DOI
                </a>
              )}
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
