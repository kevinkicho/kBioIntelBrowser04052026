'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { FoodBCompound } from '@/lib/types'
import {
  alphaSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

interface FooDBPanelProps {
  compounds?: FoodBCompound[]
  panelId?: string
  lastFetched?: Date
}

export const FooDBPanel = memo(function FooDBPanel({ compounds, panelId, lastFetched }: FooDBPanelProps) {
  const list = compounds ?? []
  const isEmpty = list.length === 0
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<FoodBCompound>((c) => c.name || ''),
      ...numberSortOptions<FoodBCompound>((c) => c.mass ?? 0, {
        high: 'Highest mass',
        low: 'Lowest mass',
      }),
      ...numberSortOptions<FoodBCompound>((c) => c.foodSources?.length ?? 0, {
        high: 'Most food sources',
        low: 'Fewest food sources',
        idPrefix: 'sources',
      }),
    ],
    [],
  )

  return (
    <Panel
      title="FooDB - Food Compounds"
      panelId={panelId}
      lastFetched={lastFetched}
      className="space-y-4"
      empty={isEmpty ? "No food compound data found in FooDB." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-sm text-slate-400">
            Compounds found in food from FooDB, the comprehensive database of food constituents and metabolites.
          </p>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Food Compounds ({list.length})
            </h3>
            <FilterablePaginatedList
              items={list}
              getSearchText={(compound) =>
                [
                  compound.name,
                  compound.id,
                  compound.formula,
                  ...(compound.foodSources ?? []),
                  ...(compound.synonyms ?? []),
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              sortOptions={sortOptions}
              defaultSortId="name-asc"
              filterPlaceholder="Filter compounds…"
              getKey={(compound) => compound.id}
              pageSize={5}
              renderItem={(compound) => (
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-100">{compound.name}</h4>
                      <p className="text-xs text-slate-400">ID: {compound.id}</p>
                    </div>
                    <a
                      href={compound.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
                    >
                      View →
                    </a>
                  </div>

                  {compound.formula && (
                    <p className="text-sm text-slate-300 mb-1">
                      <span className="font-medium text-slate-100">Formula:</span> {compound.formula}
                    </p>
                  )}

                  {compound.mass > 0 && (
                    <p className="text-sm text-slate-300 mb-1">
                      <span className="font-medium text-slate-100">Mass:</span> {compound.mass.toFixed(2)} Da
                    </p>
                  )}

                  {compound.foodSources.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-400 mb-1">Food Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {compound.foodSources.slice(0, 5).map((source, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-green-900/40 text-green-300 border border-green-700/30 rounded"
                          >
                            {source}
                          </span>
                        ))}
                        {compound.foodSources.length > 5 && (
                          <span className="px-2 py-0.5 text-xs text-slate-500">
                            +{compound.foodSources.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {compound.synonyms.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Synonyms:</p>
                      <p className="text-xs text-slate-500">{compound.synonyms.slice(0, 3).join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        </>
      )}
    </Panel>
  )
})
