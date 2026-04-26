'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { isMatch } from '@/hooks/useDiseaseContext'
import type { ChemblIndication } from '@/lib/types'

const phaseColors: Record<number, { bg: string; label: string }> = {
  4: { bg: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30', label: 'Phase 4' },
  3: { bg: 'bg-blue-900/40 text-blue-300 border-blue-700/30', label: 'Phase 3' },
  2: { bg: 'bg-amber-900/40 text-amber-300 border-amber-700/30', label: 'Phase 2' },
  1: { bg: 'bg-slate-700/40 text-slate-300 border-slate-600/30', label: 'Phase 1' },
}

export const ChemblIndicationsPanel = memo(function ChemblIndicationsPanel({ indications, panelId, lastFetched, diseaseName }: { indications: ChemblIndication[], panelId?: string, lastFetched?: Date, diseaseName?: string }) {
  const sortedIndications = useMemo(() => {
    if (!diseaseName) return indications
    const matched = indications.filter(ind => {
      const text = [ind.meshHeading, ind.efoTerm, ind.condition].join(' ')
      return isMatch(text, diseaseName)
    })
    const nonMatched = indications.filter(ind => {
      const text = [ind.meshHeading, ind.efoTerm, ind.condition].join(' ')
      return !isMatch(text, diseaseName)
    })
    return [...matched, ...nonMatched]
  }, [indications, diseaseName])

  const isEmpty = indications.length === 0

  const matchCount = !isEmpty && diseaseName ? sortedIndications.filter(ind => {
    const text = [ind.meshHeading, ind.efoTerm, ind.condition].join(' ')
    return isMatch(text, diseaseName)
  }).length : 0

  const titleExtra = !isEmpty && diseaseName && matchCount > 0
    ? <span className="text-xs font-normal text-amber-300">{matchCount} relevant to {diseaseName}</span>
    : null

  return (
    <Panel
      title="Drug Indications (ChEMBL)"
      panelId={panelId}
      lastFetched={lastFetched}
      titleExtra={titleExtra}
      empty={isEmpty ? "No drug indication data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {sortedIndications.map((ind, i) => {
            const phase = phaseColors[ind.maxPhaseForIndication] ?? phaseColors[1]
            const displayName = ind.meshHeading || ind.efoTerm || 'Unknown indication'
            const displayId = ind.meshId || ind.efoId || ''
            const text = [ind.meshHeading, ind.efoTerm, ind.condition].join(' ')
            const diseaseMatch = diseaseName ? isMatch(text, diseaseName) : false
            return (
              <div key={i} className={`py-3 border-b border-slate-700 last:border-0 ${diseaseMatch ? 'bg-amber-950/20 -mx-4 px-4 rounded-md' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={ind.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
                  >
                    {displayName}
                  </a>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {diseaseMatch && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40">
                        Match
                      </span>
                    )}
                    <span className={`text-xs border px-2 py-0.5 rounded ${phase.bg}`}>
                      {phase.label}
                    </span>
                  </div>
                </div>
                {displayId && (
                  <p className="text-xs text-slate-500 mt-1">{displayId}</p>
                )}
              </div>
            )
          })}
        </PaginatedList>
      )}
    </Panel>
  )
})