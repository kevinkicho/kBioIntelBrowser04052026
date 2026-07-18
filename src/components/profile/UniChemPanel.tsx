'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { UniChemMapping } from '@/lib/types'
import { unichemMappingDeepLink } from '@/lib/api/unichem'
import { isBrokenSourceShellUrl, preferStableDeepLink } from '@/lib/deepLinkPolicy'
import { alphaSortOptions } from '@/lib/listControls'

interface UniChemPanelProps {
  mappings?: UniChemMapping[]
  panelId?: string
  lastFetched?: Date
}

function mappingHref(mapping: UniChemMapping): string {
  const fallback = unichemMappingDeepLink(
    mapping.sourceName,
    mapping.externalId,
    mapping.sourceId,
  )
  return preferStableDeepLink(
    isBrokenSourceShellUrl(mapping.url) ? null : mapping.url,
    fallback,
  )
}

export const UniChemPanel = memo(function UniChemPanel({
  mappings,
  panelId,
  lastFetched,
}: UniChemPanelProps) {
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
      empty={
        isEmpty
          ? 'No cross-reference data found. UniChem provides mappings between chemical databases.'
          : undefined
      }
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-2">
            Each row opens the matching record in the source database (not the UniChem homepage).
          </p>
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
            className="space-y-0"
            renderItem={(mapping, index) => {
              const href = mappingHref(mapping)
              return (
                <div>
                  {index === 0 && (
                    <div
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_3rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                      role="row"
                    >
                      <span>Source</span>
                      <span>External ID</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Open ${mapping.sourceName} record ${mapping.externalId}`}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_3rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                  >
                    <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                      {mapping.sourceName || mapping.sourceId || '—'}
                    </span>
                    <span className="text-xs font-mono text-slate-400 truncate">
                      {mapping.externalId || '—'}
                    </span>
                    <span className="text-xs text-blue-400 group-hover:text-blue-300 text-right">
                      ↗
                    </span>
                  </a>
                </div>
              )
            }}
          />
        </>
      )}
    </Panel>
  )
})
