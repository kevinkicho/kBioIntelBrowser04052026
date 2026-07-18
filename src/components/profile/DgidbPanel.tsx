'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { DrugGeneInteraction } from '@/lib/types'
import {
  alphaSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

export const DgidbPanel = memo(function DgidbPanel({ interactions, panelId, lastFetched }: { interactions: DrugGeneInteraction[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = interactions.length === 0
  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<DrugGeneInteraction>((x) => x.score ?? 0, {
        high: 'Highest score',
        low: 'Lowest score',
      }),
      ...alphaSortOptions<DrugGeneInteraction>((x) => x.geneName || x.geneSymbol || ''),
      ...alphaSortOptions<DrugGeneInteraction>((x) => x.interactionType || '').map((o) => ({
        ...o,
        id: `type-${o.id}`,
        label: o.id === 'name-asc' ? 'Type A–Z' : 'Type Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="Drug-Gene Interactions (DGIdb)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No drug-gene interactions found for this molecule." : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={interactions}
          getSearchText={(interaction) =>
            [
              interaction.geneName,
              interaction.geneSymbol,
              interaction.interactionType,
              interaction.source,
              String(interaction.score),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="num-desc"
          filterPlaceholder="Filter interactions…"
          getKey={(_, i) => i}
          pageSize={5}
          className="space-y-3"
          renderItem={(interaction) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/gene?q=${encodeURIComponent(interaction.geneSymbol || interaction.geneName)}`}
                  className="text-xs font-semibold bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0 hover:bg-cyan-800/60 transition-colors"
                >
                  {interaction.geneName}
                </Link>
                {interaction.interactionType && (
                  <span className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded shrink-0">
                    {interaction.interactionType}
                  </span>
                )}
              </div>
              {interaction.source && (
                <p className="text-xs text-slate-400 mt-1">Sources: {interaction.source}</p>
              )}
              {interaction.score > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">Score: {interaction.score.toFixed(1)}</p>
              )}
              <a href={interaction.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
                View in DGIdb →
              </a>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
