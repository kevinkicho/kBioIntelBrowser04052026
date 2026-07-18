'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { GwasAssociation } from '@/lib/types'
import {
  alphaSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

function formatPValue(pValue: number): string {
  if (pValue === 0) return 'N/A'
  return pValue.toExponential(2)
}

export const GwasCatalogPanel = memo(function GwasCatalogPanel({ associations, panelId, lastFetched }: { associations: GwasAssociation[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = associations.length === 0
  const sortOptions = useMemo(
    () => [
      // Lower p-value = more significant → default lowest first
      ...numberSortOptions<GwasAssociation>((a) => {
        const p = a.pValue
        return p > 0 ? p : Number.POSITIVE_INFINITY
      }, {
        high: 'Highest p-value',
        low: 'Most significant (low p)',
      }),
      ...alphaSortOptions<GwasAssociation>((a) => a.traitName || ''),
      ...alphaSortOptions<GwasAssociation>((a) => a.geneSymbol || '').map((o) => ({
        ...o,
        id: `gene-${o.id}`,
        label: o.id === 'name-asc' ? 'Gene A–Z' : 'Gene Z–A',
      })),
      ...alphaSortOptions<GwasAssociation>((a) => a.region || '').map((o) => ({
        ...o,
        id: `region-${o.id}`,
        label: o.id === 'name-asc' ? 'Region A–Z' : 'Region Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="GWAS Catalog"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No GWAS associations found for this molecule." : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={associations}
          getSearchText={(assoc) =>
            [
              assoc.traitName,
              assoc.riskAllele,
              assoc.region,
              assoc.geneSymbol,
              assoc.studyId,
              String(assoc.pValue),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="num-asc"
          filterPlaceholder="Filter associations…"
          getKey={(_, i) => i}
          pageSize={5}
          className="space-y-3"
          renderItem={(assoc) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <p className="font-semibold text-slate-100 text-sm">{assoc.traitName}</p>

              <div className="flex items-center gap-2 mt-1">
                {assoc.riskAllele && (
                  <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/30 px-2 py-0.5 rounded">
                    {assoc.riskAllele}
                  </span>
                )}
                {assoc.region && (
                  <span className="text-xs text-slate-400">Region: {assoc.region}</span>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">
                  p-value: <span className="text-slate-200 font-mono">{formatPValue(assoc.pValue)}</span>
                </span>
                {assoc.url && (
                  <a
                    href={assoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    View study →
                  </a>
                )}
              </div>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
