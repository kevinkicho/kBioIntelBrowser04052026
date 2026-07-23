'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { DescriptionTip } from '@/components/ui/HelperTip'
import type { MeshTerm } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

export const MeshPanel = memo(function MeshPanel({
  terms,
  panelId,
  lastFetched,
}: {
  terms: MeshTerm[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(terms) ? terms : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => alphaSortOptions<MeshTerm>((t) => t.name || t.termName || ''),
    [],
  )

  return (
    <Panel
      title={isEmpty ? 'MeSH Terms (NLM)' : `MeSH Terms (NLM) (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No MeSH term data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(t) =>
            [
              t.name,
              t.termName,
              t.meshId,
              t.scopeNote,
              t.definition,
              ...(t.treeNumbers || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter MeSH terms…"
          getKey={(term, i) => `${term.meshId || term.name}-${i}`}
          renderItem={(term) => (
            <div className="py-2 border-b border-slate-700/60 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <a
                      href={term.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-slate-100 hover:text-cyan-300"
                    >
                      {term.name}
                    </a>
                    {term.meshId && (
                      <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-900/20 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                        {term.meshId}
                      </span>
                    )}
                  </div>
                  <DescriptionTip text={term.scopeNote} label="Scope note" />
                  {term.treeNumbers?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {term.treeNumbers.slice(0, 6).map((tn, j) => (
                        <span
                          key={j}
                          className="text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded"
                        >
                          {tn}
                        </span>
                      ))}
                      {term.treeNumbers.length > 6 && (
                        <span className="text-[10px] text-slate-600">
                          +{term.treeNumbers.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {term.url && (
                  <a
                    href={term.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] text-cyan-400 hover:text-cyan-300"
                  >
                    MeSH
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
