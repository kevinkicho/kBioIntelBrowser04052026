'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { UniProtProtein } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

export const UniProtExtendedPanel = memo(function UniProtExtendedPanel({ proteins, panelId, lastFetched }: { proteins: UniProtProtein[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(proteins) ? proteins : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<UniProtProtein>((p) => p.proteinName || ''),
      ...alphaSortOptions<UniProtProtein>((p) => p.geneName || '').map((o) => ({
        ...o,
        id: `gene-${o.id}`,
        label: o.id.includes('asc') ? 'Gene A–Z' : 'Gene Z–A',
      })),
      ...numberSortOptions<UniProtProtein>((p) => p.length || 0, {
        high: 'Longest sequence',
        low: 'Shortest sequence',
        idPrefix: 'len',
      }),
    ],
    [],
  )

  return (
    <Panel
      title="UniProt Extended"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No extended UniProt data found.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(protein) =>
            [
              protein.proteinName,
              protein.geneName,
              protein.organism,
              protein.function,
              protein.subcellularLocation,
              protein.accession,
              ...(protein.pathways || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter proteins (name, gene, accession…)"
          getKey={(protein, i) => `${protein.accession || i}`}
          renderItem={(protein) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">{protein.proteinName}</p>
                {protein.geneName && (
                  <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/30 px-2 py-0.5 rounded shrink-0">
                    {protein.geneName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{protein.organism} • {protein.length} aa</p>
              {protein.function && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{protein.function}</p>
              )}
              {protein.subcellularLocation && (
                <p className="text-xs text-slate-500 mt-0.5">Location: {protein.subcellularLocation}</p>
              )}
              {protein.pathways && protein.pathways.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {protein.pathways.slice(0, 3).map((pw, j) => (
                    <span key={j} className="text-xs bg-blue-900/30 text-blue-300 border border-blue-700/30 px-1.5 py-0.5 rounded">
                      {pw}
                    </span>
                  ))}
                </div>
              )}
              <a
                href={`https://www.uniprot.org/uniprotkb/${protein.accession}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                {protein.accession} →
              </a>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
