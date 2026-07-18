'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { HPOTerm } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

export const HPOPanel = memo(function HPOPanel({
  terms,
  panelId,
  lastFetched,
}: {
  terms: HPOTerm[]
  panelId?: string
  lastFetched?: Date
}) {
  const safeTerms = Array.isArray(terms) ? terms : []
  const isEmpty = safeTerms.length === 0

  const sortOptions = useMemo(
    () => alphaSortOptions<HPOTerm>((t) => t.name || ''),
    [],
  )

  return (
    <Panel
      title={isEmpty ? 'Human Phenotype Ontology' : `Human Phenotype Ontology (${safeTerms.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No HPO terms found.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={safeTerms}
          getSearchText={(t) =>
            [t.name, t.id, t.definition, ...(t.synonyms || [])].filter(Boolean).join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter HPO terms…"
          getKey={(term, i) => `${term.id || i}-${i}`}
          renderItem={(term) => {
            const href = `https://hpo.jax.org/app/web/term/${term.id}`
            return (
              <div className="py-2 border-b border-slate-700/60 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-slate-100 hover:text-emerald-300"
                      >
                        {term.name}
                      </a>
                      <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-900/20 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                        {term.id}
                      </span>
                    </div>
                    {term.definition && (
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-snug">
                        {term.definition}
                      </p>
                    )}
                    {term.synonyms?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {term.synonyms.slice(0, 5).map((syn, j) => (
                          <span
                            key={j}
                            className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded"
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                    )}
                    {(term.parents?.length > 0 || term.children?.length > 0) && (
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {[
                          term.parents?.length ? `${term.parents.length} parents` : null,
                          term.children?.length ? `${term.children.length} children` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] text-emerald-400 hover:text-emerald-300"
                  >
                    HPO ↗
                  </a>
                </div>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
