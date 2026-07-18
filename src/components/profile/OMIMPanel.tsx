'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { OMIMEntry } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

interface OMIMPanelProps {
  entries?: OMIMEntry[]
  panelId?: string
  lastFetched?: Date
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'live':
      return 'bg-green-900/50 text-green-300'
    case 'removed':
      return 'bg-red-900/50 text-red-300'
    default:
      return 'bg-slate-700 text-slate-300'
  }
}

function getPrefixColor(prefix: string) {
  switch (prefix) {
    case '*':
      return 'bg-purple-900/50 text-purple-300' // Gene
    case '#':
      return 'bg-blue-900/50 text-blue-300' // Phenotype
    case '+':
      return 'bg-green-900/50 text-green-300' // Gene and phenotype
    case '%':
      return 'bg-orange-900/50 text-orange-300' // Heritable phenotype
    default:
      return 'bg-slate-700 text-slate-300'
  }
}

export const OMIMPanel = memo(function OMIMPanel({ entries, panelId, lastFetched }: OMIMPanelProps) {
  const list = Array.isArray(entries) ? entries : []
  const isEmpty = list.length === 0
  const title = isEmpty ? 'OMIM' : 'OMIM Genetic Disorders'

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<OMIMEntry>((e) => e.name || ''),
      ...numberSortOptions<OMIMEntry>((e) => Number(e.mimNumber) || 0, {
        high: 'Highest MIM',
        low: 'Lowest MIM',
        idPrefix: 'mim',
      }),
    ],
    [],
  )

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No OMIM entries found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(entry) =>
            [
              entry.name,
              entry.mimNumber,
              entry.status,
              entry.description,
              ...(entry.geneSymbols || []),
              ...(entry.phenotypes?.map((p) => p.name) || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter entries (name, MIM, gene…)"
          getKey={(entry, idx) => `${entry.mimNumber || idx}`}
          renderItem={(entry) => (
            <div className="py-2 border-b border-slate-700/50 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      {entry.name}
                    </a>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getPrefixColor(entry.prefix)}`}>
                      OMIM:{entry.mimNumber}
                    </span>
                  </div>

                  <div className="flex gap-1 mt-1">
                    {entry.status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    )}
                  </div>

                  {entry.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{entry.description}</p>
                  )}

                  {entry.geneSymbols && entry.geneSymbols.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Associated genes: {entry.geneSymbols.slice(0, 5).join(', ')}
                      {entry.geneSymbols.length > 5 && ` +${entry.geneSymbols.length - 5} more`}
                    </p>
                  )}

                  {entry.phenotypes && entry.phenotypes.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Phenotypes: {entry.phenotypes.slice(0, 3).map((p) => p.name).join(', ')}
                      {entry.phenotypes.length > 3 && ` +${entry.phenotypes.length - 3} more`}
                    </p>
                  )}

                  {entry.references && entry.references.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {entry.references.length} references
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
