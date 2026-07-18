'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { GeneInfo } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

export const NcbiGenePanel = memo(function NcbiGenePanel({ genes, panelId, lastFetched }: { genes: GeneInfo[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(genes) ? genes : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<GeneInfo>((g) => g.symbol || ''),
      ...alphaSortOptions<GeneInfo>((g) => g.name || '').map((o) => ({
        ...o,
        id: `fullname-${o.id}`,
        label: o.id.includes('asc') ? 'Name A–Z' : 'Name Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="NCBI Gene"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No NCBI Gene entries found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(gene) =>
            [gene.symbol, gene.name, gene.geneId, gene.summary, gene.chromosome, gene.mapLocation]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter genes (symbol, name, ID…)"
          getKey={(gene, i) => `${gene.geneId || gene.symbol || i}`}
          renderItem={(gene) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium text-slate-200">{gene.symbol}</h4>
                  <p className="text-xs text-slate-400">{gene.name}</p>
                </div>
                <span className="text-xs font-mono bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                  GeneID: {gene.geneId}
                </span>
              </div>
              {gene.summary && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{gene.summary}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-1">
                {gene.chromosome && (
                  <span className="text-xs text-slate-500">Chr: {gene.chromosome}</span>
                )}
                {gene.mapLocation && (
                  <span className="text-xs text-slate-500">Location: {gene.mapLocation}</span>
                )}
              </div>
              <a
                href={gene.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                View in NCBI Gene →
              </a>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
