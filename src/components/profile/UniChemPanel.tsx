'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { UniChemMapping } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

interface UniChemPanelProps {
  mappings?: UniChemMapping[]
  panelId?: string
  lastFetched?: Date
}

export const UniChemPanel = memo(function UniChemPanel({ mappings, panelId, lastFetched }: UniChemPanelProps) {
  const list = Array.isArray(mappings) ? mappings : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<UniChemMapping>((m) => m.sourceName || ''),
      ...alphaSortOptions<UniChemMapping>((m) => m.externalId || '').map((o) => ({
        ...o,
        id: `ext-${o.id}`,
        label: o.id.includes('asc') ? 'External ID A–Z' : 'External ID Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="UniChem Cross-References"
      panelId={panelId}
      lastFetched={lastFetched}
      className="space-y-4"
      empty={isEmpty ? 'No cross-reference data found. UniChem provides mappings between chemical databases.' : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-sm text-slate-400">
            Cross-references from EMBL-EBI UniChem, mapping this compound across multiple chemical databases.
          </p>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Database Mappings ({list.length})
            </h3>
            <FilterablePaginatedList
              items={list}
              getSearchText={(mapping) =>
                [mapping.sourceName, mapping.externalId, mapping.sourceId]
                  .filter(Boolean)
                  .join(' ')
              }
              sortOptions={sortOptions}
              defaultSortId="name-asc"
              filterPlaceholder="Filter mappings (source, ID…)"
              getKey={(mapping, idx) => `${mapping.sourceId}-${mapping.externalId}-${idx}`}
              pageSize={10}
              renderItem={(mapping) => (
                <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100 text-sm">{mapping.sourceName}</p>
                      <p className="text-xs text-slate-400 truncate">ID: {mapping.externalId}</p>
                    </div>
                    {mapping.url && (
                      <a
                        href={mapping.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
                      >
                        View →
                      </a>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        </>
      )}
    </Panel>
  )
})
