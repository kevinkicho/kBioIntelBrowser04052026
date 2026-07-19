'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { DrugGeneInteraction } from '@/lib/types'
import { preferStableDeepLink } from '@/lib/deepLinkPolicy'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

function dgidbHref(interaction: DrugGeneInteraction): string {
  const gene = interaction.geneSymbol || interaction.geneName
  const fallback = gene
    ? `https://www.dgidb.org/results?searchType=gene&searchTerms=${encodeURIComponent(gene)}`
    : 'https://www.dgidb.org/results'
  return preferStableDeepLink(interaction.url, fallback)
}

export const DgidbPanel = memo(function DgidbPanel({
  interactions,
  panelId,
  lastFetched,
}: {
  interactions: DrugGeneInteraction[]
  panelId?: string
  lastFetched?: Date
}) {
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
      empty={isEmpty ? 'No drug-gene interactions found for this molecule.' : undefined}
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
          pageSize={8}
          className="space-y-0"
          renderItem={(interaction, index) => {
            const href = dgidbHref(interaction)
            const gene = interaction.geneName || interaction.geneSymbol || '—'
            return (
              <div>
                {index === 0 && (
                  <div
                    className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_3.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                    role="row"
                  >
                    <span>Gene</span>
                    <span>Type</span>
                    <span>Sources</span>
                    <span className="text-right">Score</span>
                  </div>
                )}
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`View ${gene} interaction in DGIdb`}
                  onClick={() =>
                    onDeepLinkClick('dgidb', href, {
                      panelId: 'dgidb',
                      label: gene,
                    })
                  }
                  className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_3.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50 transition-colors group"
                >
                  <span className="text-xs font-semibold text-cyan-300 group-hover:text-cyan-200 truncate" title={gene}>
                    {gene}
                  </span>
                  <span className="text-xs text-violet-300/90 truncate">
                    {interaction.interactionType || '—'}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate" title={interaction.source}>
                    {interaction.source || '—'}
                  </span>
                  <span className="text-[11px] text-slate-500 text-right tabular-nums">
                    {interaction.score > 0 ? interaction.score.toFixed(1) : '—'}
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
