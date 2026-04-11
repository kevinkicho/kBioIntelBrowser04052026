import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { ChemblIndication } from '@/lib/types'

const phaseColors: Record<number, { bg: string; label: string }> = {
  4: { bg: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30', label: 'Phase 4' },
  3: { bg: 'bg-blue-900/40 text-blue-300 border-blue-700/30', label: 'Phase 3' },
  2: { bg: 'bg-amber-900/40 text-amber-300 border-amber-700/30', label: 'Phase 2' },
  1: { bg: 'bg-slate-700/40 text-slate-300 border-slate-600/30', label: 'Phase 1' },
}

export const ChemblIndicationsPanel = memo(function ChemblIndicationsPanel({ indications, panelId, lastFetched }: { indications: ChemblIndication[], panelId?: string, lastFetched?: Date }) {
  if (indications.length === 0) {
    return (
      <Panel title="Drug Indications (ChEMBL)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No drug indication data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Drug Indications (ChEMBL)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {indications.map((ind, i) => {
          const phase = phaseColors[ind.maxPhaseForIndication] ?? phaseColors[1]
          const displayName = ind.meshHeading || ind.efoTerm || 'Unknown indication'
          const displayId = ind.meshId || ind.efoId || ''
          return (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <a
                  href={ind.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
                >
                  {displayName}
                </a>
                <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${phase.bg}`}>
                  {phase.label}
                </span>
              </div>
              {displayId && (
                <p className="text-xs text-slate-500 mt-1">{displayId}</p>
              )}
            </div>
          )
        })}
      </PaginatedList>
    </Panel>
  )
})
