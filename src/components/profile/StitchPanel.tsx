'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { ChemicalProteinInteraction } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { preferStableDeepLink } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

function stitchHref(interaction: ChemicalProteinInteraction): string {
  const fallback = interaction.chemicalName
    ? `http://stitch.embl.de/cgi/network.pl?search_terms=${encodeURIComponent(interaction.chemicalName)}`
    : 'http://stitch.embl.de/'
  return preferStableDeepLink(interaction.url, fallback)
}

export const StitchPanel = memo(function StitchPanel({
  interactions,
  panelId,
  lastFetched,
}: {
  interactions: ChemicalProteinInteraction[]
  panelId?: string
  lastFetched?: Date
}) {
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
      empty={
        isEmpty ? 'No chemical-protein interactions found for this molecule.' : undefined
      }
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(interaction) =>
            [interaction.chemicalName, interaction.proteinName].filter(Boolean).join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="num-desc"
          filterPlaceholder="Filter interactions (chemical, protein…)"
          getKey={(interaction, i) =>
            `${interaction.chemicalName}-${interaction.proteinName}-${i}`
          }
          pageSize={8}
          className="space-y-0"
          renderItem={(interaction, index) => {
            const href = stitchHref(interaction)
            return (
              <div>
                {index === 0 && (
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                    role="row"
                  >
                    <span>Chemical</span>
                    <span>Protein</span>
                    <span className="text-right">Score</span>
                  </div>
                )}
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    onDeepLinkClick('stitch', href, {
                      panelId: 'stitch',
                      label: interaction.proteinName,
                    })
                  }
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                >
                  <span className="text-sm text-slate-100 truncate group-hover:text-orange-200">
                    {interaction.chemicalName || '—'}
                  </span>
                  <span className="text-sm text-slate-100 truncate group-hover:text-orange-200">
                    {interaction.proteinName || '—'}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-right text-slate-300">
                    {(interaction.combinedScore ?? 0).toFixed(3)}
                  </span>
                </a>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
