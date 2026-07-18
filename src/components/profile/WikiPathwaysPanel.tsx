'use client'

import { memo, useMemo } from 'react'
import Image from 'next/image'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { WikiPathway } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

export const WikiPathwaysPanel = memo(function WikiPathwaysPanel({ pathways, panelId, lastFetched }: { pathways: WikiPathway[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(pathways) ? pathways : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<WikiPathway>((p) => p.name || ''),
      ...alphaSortOptions<WikiPathway>((p) => p.id || '').map((o) => ({
        ...o,
        id: `id-${o.id}`,
        label: o.id.includes('asc') ? 'ID A–Z' : 'ID Z–A',
      })),
      ...alphaSortOptions<WikiPathway>((p) => p.species || '').map((o) => ({
        ...o,
        id: `species-${o.id}`,
        label: o.id.includes('asc') ? 'Species A–Z' : 'Species Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="WikiPathways"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No WikiPathways data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(pathway) =>
            [pathway.id, pathway.name, pathway.species].filter(Boolean).join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter pathways (name, ID, species…)"
          getKey={(pathway, i) => `${pathway.id || i}`}
          renderItem={(pathway) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded font-mono">
                    {pathway.id}
                  </span>
                  <p className="font-semibold text-slate-100 text-sm">{pathway.name}</p>
                </div>
                <a
                  href={pathway.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
                >
                  WikiPathways →
                </a>
              </div>
              <div className="mt-2">
                <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded">
                  {pathway.species}
                </span>
              </div>
              <details className="mt-2">
                <summary className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer">
                  View Pathway
                </summary>
                <div className="mt-2 bg-white rounded-lg p-2 overflow-hidden relative">
                  <Image
                    src={`https://www.wikipathways.org/wikipathways/wpi/wpi.php?action=downloadFile&type=png&pwTitle=Pathway:${pathway.id}`}
                    alt={`Diagram of ${pathway.name}`}
                    width={600}
                    height={256}
                    className="w-full h-auto max-h-64 object-contain"
                    loading="lazy"
                    unoptimized
                  />
                </div>
              </details>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
