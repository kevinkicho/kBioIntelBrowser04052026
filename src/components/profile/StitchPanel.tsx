'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { ChemicalProteinInteraction } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

export const StitchPanel = memo(function StitchPanel({ interactions, panelId, lastFetched }: { interactions: ChemicalProteinInteraction[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(interactions) ? interactions : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<ChemicalProteinInteraction>((i) => i.combinedScore || 0, {
        high: 'Highest score',
        low: 'Lowest score',
      }),
      ...alphaSortOptions<ChemicalProteinInteraction>((i) => i.proteinName || ''),
      ...alphaSortOptions<ChemicalProteinInteraction>((i) => i.chemicalName || '').map((o) => ({
        ...o,
        id: `chem-${o.id}`,
        label: o.id.includes('asc') ? 'Chemical A–Z' : 'Chemical Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="Chemical-Protein Interactions (STITCH)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No chemical-protein interactions found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(interaction) =>
            [interaction.chemicalName, interaction.proteinName]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="num-desc"
          filterPlaceholder="Filter interactions (chemical, protein…)"
          getKey={(interaction, i) => `${interaction.chemicalName}-${interaction.proteinName}-${i}`}
          renderItem={(interaction) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">
                  {interaction.chemicalName} → {interaction.proteinName}
                </p>
                <a href={interaction.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0">
                  STITCH →
                </a>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Combined score</span>
                  <span className="text-xs font-mono text-slate-200">{interaction.combinedScore.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${(interaction.combinedScore * 100).toFixed(1)}%` }} />
                </div>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {interaction.experimentalScore > 0 && (
                  <span className="text-xs bg-teal-900/40 text-teal-300 border border-teal-700/30 px-2 py-0.5 rounded">
                    exp {interaction.experimentalScore.toFixed(3)}
                  </span>
                )}
                {interaction.databaseScore > 0 && (
                  <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded">
                    db {interaction.databaseScore.toFixed(3)}
                  </span>
                )}
                {interaction.textminingScore > 0 && (
                  <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded">
                    text {interaction.textminingScore.toFixed(3)}
                  </span>
                )}
              </div>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
