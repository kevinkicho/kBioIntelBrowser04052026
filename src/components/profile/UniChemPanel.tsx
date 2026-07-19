'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { UniChemMapping } from '@/lib/types'
import { unichemMappingDeepLink, unichemSourceCategory } from '@/lib/api/unichem'
import { isBrokenSourceShellUrl, preferStableDeepLink } from '@/lib/deepLinkPolicy'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

interface UniChemPanelProps {
  mappings?: UniChemMapping[]
  panelId?: string
  lastFetched?: Date
}

const CATEGORY_CHIP: Record<string, string> = {
  drug: 'bg-emerald-900/35 text-emerald-300 border-emerald-800/40',
  chemistry: 'bg-sky-900/35 text-sky-300 border-sky-800/40',
  metabolomics: 'bg-amber-900/35 text-amber-300 border-amber-800/40',
  structure: 'bg-violet-900/35 text-violet-300 border-violet-800/40',
  assay: 'bg-rose-900/35 text-rose-300 border-rose-800/40',
  other: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
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

function displaySource(m: UniChemMapping): string {
  const name = (m.sourceName || '').trim()
  if (name) return name
  return m.sourceId ? `source ${m.sourceId}` : '—'
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
      ...alphaSortOptions<UniChemMapping>(
        (m) => m.sourceCategory || unichemSourceCategory(m.sourceName, m.sourceId),
      ).map((o) => ({
        ...o,
        id: `cat-${o.id}`,
        label: o.id.includes('asc') ? 'Category A–Z' : 'Category Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={isEmpty ? 'UniChem Cross-References' : `UniChem Cross-References (${list.length})`}
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
            Cross-registry IDs for this structure (EBI UniChem). Click a row to open that record in
            the source database — not the UniChem homepage.
          </p>
          <FilterablePaginatedList
            items={list}
            getSearchText={(mapping) =>
              [
                mapping.sourceName,
                mapping.sourceFullName,
                mapping.externalId,
                mapping.sourceId,
                mapping.sourceCategory,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter mappings (source, ID, category…)"
            getKey={(mapping, idx) => `${mapping.sourceId}-${mapping.externalId}-${idx}`}
            pageSize={12}
            className="space-y-0"
            renderItem={(mapping, index) => {
              const href = mappingHref(mapping)
              const category =
                mapping.sourceCategory ||
                unichemSourceCategory(mapping.sourceName, mapping.sourceId)
              const catClass = CATEGORY_CHIP[category] || CATEGORY_CHIP.other
              const source = displaySource(mapping)

              return (
                <div data-testid={`unichem-row-${mapping.sourceId || index}`}>
                  {index === 0 && (
                    <div
                      className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(4.5rem,0.55fr)_minmax(3.5rem,0.45fr)] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                      role="row"
                    >
                      <span>Source</span>
                      <span>External ID</span>
                      <span>Category</span>
                      <span className="text-right">Src #</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${source}: ${mapping.externalId}`}
                    onClick={() =>
                      onDeepLinkClick('unichem', href, {
                        panelId: 'unichem',
                        label: `${source}:${mapping.externalId}`,
                      })
                    }
                    className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(4.5rem,0.55fr)_minmax(3.5rem,0.45fr)] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate block capitalize">
                        {source.replace(/_/g, ' ')}
                      </span>
                      {mapping.sourceFullName &&
                        mapping.sourceFullName.toLowerCase() !== source.toLowerCase() && (
                          <span
                            className="text-[10px] text-slate-500 truncate block"
                            title={mapping.sourceFullName}
                          >
                            {mapping.sourceFullName}
                          </span>
                        )}
                    </div>
                    <span className="text-xs font-mono text-slate-300 truncate group-hover:text-cyan-300">
                      {mapping.externalId || '—'}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border capitalize truncate justify-self-start ${catClass}`}
                    >
                      {category}
                    </span>
                    <span
                      className="text-[10px] font-mono text-slate-600 text-right tabular-nums"
                      title={`UniChem sourceID ${mapping.sourceId}`}
                    >
                      {mapping.sourceId || '—'}
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
