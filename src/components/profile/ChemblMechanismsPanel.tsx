import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { ChemblMechanism } from '@/lib/types'

const actionTypeColors: Record<string, string> = {
  INHIBITOR: 'bg-red-900/40 text-red-300 border-red-700/30',
  AGONIST: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  ANTAGONIST: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
}

const defaultColors = 'bg-slate-700/40 text-slate-300 border-slate-600/30'

export const ChemblMechanismsPanel = memo(function ChemblMechanismsPanel({ mechanisms, panelId, lastFetched }: { mechanisms: ChemblMechanism[], panelId?: string, lastFetched?: Date }) {
  if (mechanisms.length === 0) {
    return (
      <Panel title="Mechanisms of Action (ChEMBL)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No mechanism of action data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Mechanisms of Action (ChEMBL)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {mechanisms.map((mech, i) => {
          const colors = actionTypeColors[mech.actionType?.toUpperCase()] ?? defaultColors
          return (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <a
                  href={mech.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
                >
                  {mech.mechanismOfAction}
                </a>
                {mech.actionType && (
                  <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${colors}`}>
                    {mech.actionType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {mech.maxPhase > 0 && (
                  <span className="text-xs text-slate-400">Max Phase: {mech.maxPhase}</span>
                )}
                <span className="text-xs text-slate-500">
                  {mech.directInteraction ? 'Direct interaction' : 'Indirect interaction'}
                </span>
              </div>
            </div>
          )
        })}
      </PaginatedList>
    </Panel>
  )
})
