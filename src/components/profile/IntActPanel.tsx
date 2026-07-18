'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { MolecularInteraction } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

export const IntActPanel = memo(function IntActPanel({
  interactions,
  panelId,
  lastFetched,
}: {
  interactions: MolecularInteraction[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(interactions) ? interactions : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<MolecularInteraction>((i) => i.confidenceScore ?? 0, {
        high: 'Highest score',
        low: 'Lowest score',
      }),
      ...alphaSortOptions<MolecularInteraction>(
        (i) => `${i.interactorA || ''} ${i.interactorB || ''}`,
      ),
    ],
    [],
  )

  return (
    <Panel
      title="Molecular Interactions (IntAct)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No molecular interaction data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(i) =>
            [
              i.interactorA,
              i.interactorB,
              i.interactionType,
              i.detectionMethod,
              i.pubmedId,
              i.interactionId,
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="num-desc"
          filterPlaceholder="Filter interactions…"
          getKey={(interaction, i) => `${interaction.interactionId || i}-${i}`}
          renderItem={(interaction) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">
                  {interaction.interactorA} ↔ {interaction.interactorB}
                </p>
                <a
                  href={interaction.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
                >
                  IntAct →
                </a>
              </div>

              <div className="flex gap-2 mt-2 flex-wrap">
                {interaction.interactionType && (
                  <span className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded">
                    {interaction.interactionType}
                  </span>
                )}
                {interaction.detectionMethod && (
                  <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded">
                    {interaction.detectionMethod}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {interaction.pubmedId && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${interaction.pubmedId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                    >
                      PubMed {interaction.pubmedId}
                    </a>
                  )}
                </div>
                {interaction.confidenceScore !== undefined && interaction.confidenceScore > 0 && (
                  <span className="text-xs text-slate-400">
                    score {interaction.confidenceScore.toFixed(3)}
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
