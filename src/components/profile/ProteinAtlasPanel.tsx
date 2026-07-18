'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { ProteinAtlasEntry } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

export const ProteinAtlasPanel = memo(function ProteinAtlasPanel({ entries, panelId, lastFetched }: { entries: ProteinAtlasEntry[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(entries) ? entries : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<ProteinAtlasEntry>((e) => e.gene || ''),
      ...alphaSortOptions<ProteinAtlasEntry>((e) => e.uniprotId || '').map((o) => ({
        ...o,
        id: `uniprot-${o.id}`,
        label: o.id.includes('asc') ? 'UniProt A–Z' : 'UniProt Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="Human Protein Atlas"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No Human Protein Atlas data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(entry) =>
            [entry.gene, entry.uniprotId, ...(entry.subcellularLocations || [])]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter entries (gene, UniProt, location…)"
          getKey={(entry, i) => `${entry.gene}-${entry.uniprotId || i}`}
          renderItem={(entry) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-mono bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
                  {entry.gene}
                </span>
                {entry.uniprotId && (
                  <span className="text-xs font-mono text-slate-400">{entry.uniprotId}</span>
                )}
              </div>
              {entry.subcellularLocations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {entry.subcellularLocations.map((loc, j) => (
                    <span
                      key={j}
                      className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded"
                    >
                      {loc}
                    </span>
                  ))}
                </div>
              )}
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                View in Protein Atlas →
              </a>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
