'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { StringInteraction } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { preferStableDeepLink } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

function stringHref(interaction: StringInteraction): string {
  const fallback =
    interaction.proteinA && interaction.proteinB
      ? `https://string-db.org/network/${encodeURIComponent(interaction.proteinA)}`
      : 'https://string-db.org/'
  return preferStableDeepLink(interaction.url, fallback)
}

export const StringPanel = memo(function StringPanel({
  interactions,
  panelId,
  lastFetched,
}: {
  interactions: StringInteraction[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(interactions) ? interactions : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<StringInteraction>((i) => i.score || 0, {
        high: 'Highest score',
        low: 'Lowest score',
      }),
      ...alphaSortOptions<StringInteraction>((i) => `${i.proteinA} ${i.proteinB}`),
    ],
    [],
  )

  return (
    <Panel
      title="Protein Interactions (STRING)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No protein interactions found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(interaction) =>
            [interaction.proteinA, interaction.proteinB].filter(Boolean).join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="num-desc"
          filterPlaceholder="Filter interactions (protein…)"
          getKey={(interaction, i) => `${interaction.proteinA}-${interaction.proteinB}-${i}`}
          pageSize={8}
          className="space-y-0"
          renderItem={(interaction, index) => {
            const href = stringHref(interaction)
            return (
              <div>
                {index === 0 && (
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.5rem_2.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                    role="row"
                  >
                    <span>Protein A</span>
                    <span>Protein B</span>
                    <span className="text-right">Score</span>
                    <span className="text-right">Open</span>
                  </div>
                )}
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    onDeepLinkClick('string', href, {
                      panelId: 'string',
                      label: `${interaction.proteinA}-${interaction.proteinB}`,
                    })
                  }
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.5rem_2.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                >
                  <span className="text-sm text-slate-100 truncate group-hover:text-indigo-200">
                    {interaction.proteinA || '—'}
                  </span>
                  <span className="text-sm text-slate-100 truncate group-hover:text-indigo-200">
                    {interaction.proteinB || '—'}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-right text-slate-300">
                    {(interaction.score ?? 0).toFixed(3)}
                  </span>
                  <span className="text-xs text-cyan-400 group-hover:text-cyan-300 text-right">
                    ↗
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
