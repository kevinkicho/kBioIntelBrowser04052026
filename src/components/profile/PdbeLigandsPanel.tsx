'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { PdbeLigand } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

export const PdbeLigandsPanel = memo(function PdbeLigandsPanel({ ligands, panelId, lastFetched }: { ligands: PdbeLigand[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(ligands) ? ligands : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<PdbeLigand>((l) => l.name || l.compId || ''),
      ...numberSortOptions<PdbeLigand>((l) => l.molecularWeight || 0, {
        high: 'Highest MW',
        low: 'Lowest MW',
        idPrefix: 'mw',
      }),
      ...alphaSortOptions<PdbeLigand>((l) => l.compId || '').map((o) => ({
        ...o,
        id: `comp-${o.id}`,
        label: o.id.includes('asc') ? 'Comp ID A–Z' : 'Comp ID Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="PDBe Ligands"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No PDBe ligand data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(ligand) =>
            [
              ligand.compId,
              ligand.name,
              ligand.formula,
              ligand.inchiKey,
              ligand.drugbankId,
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter ligands (name, ID, formula…)"
          getKey={(ligand, i) => `${ligand.compId || i}`}
          renderItem={(ligand) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded">
                  {ligand.compId}
                </span>
              </div>
              <p className="text-sm text-slate-200 mt-1 font-medium">{ligand.name}</p>
              {ligand.formula && (
                <p className="text-xs text-slate-400 mt-1">Formula: {ligand.formula}</p>
              )}
              {ligand.molecularWeight > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">MW: {ligand.molecularWeight}</p>
              )}
              {ligand.inchiKey && (
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{ligand.inchiKey}</p>
              )}
              {ligand.drugbankId && (
                <p className="text-xs text-slate-500 mt-0.5">DrugBank: {ligand.drugbankId}</p>
              )}
              <a
                href={ligand.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                View on PDBe →
              </a>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
