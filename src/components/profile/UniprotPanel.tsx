'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { DescriptionTip } from '@/components/ui/HelperTip'
import type { UniprotEntry } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

export const UniprotPanel = memo(function UniprotPanel({ entries, panelId, lastFetched }: { entries: UniprotEntry[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(entries) ? entries : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<UniprotEntry>((e) => e.proteinName || ''),
      ...alphaSortOptions<UniprotEntry>((e) => e.geneName || '').map((o) => ({
        ...o,
        id: `gene-${o.id}`,
        label: o.id.includes('asc') ? 'Gene A–Z' : 'Gene Z–A',
      })),
      ...alphaSortOptions<UniprotEntry>((e) => e.organism || '').map((o) => ({
        ...o,
        id: `org-${o.id}`,
        label: o.id.includes('asc') ? 'Organism A–Z' : 'Organism Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="Gene & Protein (UniProt)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No protein/gene data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(entry) =>
            [
              entry.proteinName,
              entry.geneName,
              entry.organism,
              entry.functionSummary,
              entry.accession,
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter proteins (name, gene, accession…)"
          getKey={(entry, i) => `${entry.accession || i}`}
          renderItem={(entry) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">{entry.proteinName}</p>
                {entry.geneName && (
                  <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/30 px-2 py-0.5 rounded shrink-0">
                    {entry.geneName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{entry.organism}</p>
              <DescriptionTip text={entry.functionSummary} label="Function" className="mt-1" />
              <a
                href={`https://www.uniprot.org/uniprotkb/${entry.accession}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
              >
                {entry.accession}
              </a>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
