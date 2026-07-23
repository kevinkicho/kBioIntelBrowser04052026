'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { DescriptionTip } from '@/components/ui/HelperTip'
import type { OLSTerm } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

function ontologyBadge(ontologyId: string): string {
  const colors: Record<string, string> = {
    GO: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
    HP: 'bg-green-900/40 text-green-300 border-green-700/30',
    MONDO: 'bg-purple-900/40 text-purple-300 border-purple-700/30',
    UBERON: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
    CL: 'bg-red-900/40 text-red-300 border-red-700/30',
    CHEBI: 'bg-pink-900/40 text-pink-300 border-pink-700/30',
    DOID: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
  }
  return colors[ontologyId] || 'bg-slate-700/60 text-slate-300 border-slate-600/40'
}

export const OLSPanel = memo(function OLSPanel({
  terms,
  panelId,
  lastFetched,
}: {
  terms: OLSTerm[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(terms) ? terms : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<OLSTerm>((t) => t.label || ''),
      ...alphaSortOptions<OLSTerm>((t) => t.ontologyId || '').map((o) => ({
        ...o,
        id: `ont-${o.id}`,
        label: o.id.includes('asc') ? 'Ontology A–Z' : 'Ontology Z–A',
      })),
      ...alphaSortOptions<OLSTerm>((t) => t.id || '').map((o) => ({
        ...o,
        id: `termid-${o.id}`,
        label: o.id.includes('asc') ? 'Term ID A–Z' : 'Term ID Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={isEmpty ? 'Ontology Lookup Service' : `Ontology Lookup Service (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No ontology terms found.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(term) =>
            [
              term.label,
              term.id,
              term.ontologyId,
              term.description,
              ...(term.synonyms || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter terms (label, ID, ontology…)"
          getKey={(term, i) => `${term.id}-${i}`}
          renderItem={(term) => (
            <div className="py-2 border-b border-slate-700/60 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-[10px] border px-1.5 py-0.5 rounded shrink-0 ${ontologyBadge(term.ontologyId)}`}
                    >
                      {term.ontologyId}
                    </span>
                    <a
                      href={term.iri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-slate-100 hover:text-blue-300"
                    >
                      {term.label}
                    </a>
                    {term.id && (
                      <span className="text-[10px] font-mono text-slate-600">{term.id}</span>
                    )}
                  </div>
                  <DescriptionTip text={term.description} />
                  {term.synonyms?.length > 0 && (
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      Also: {term.synonyms.slice(0, 4).join(', ')}
                      {term.synonyms.length > 4 ? '…' : ''}
                    </p>
                  )}
                  {(term.parents?.length > 0 || term.mappings?.length > 0) && (
                    <div className="mt-1 flex flex-wrap gap-1 items-center">
                      {term.parents?.length > 0 && (
                        <span className="text-[10px] text-slate-600">
                          {term.parents.length} parents
                        </span>
                      )}
                      {term.mappings?.slice(0, 4).map((m, j) => (
                        <a
                          key={j}
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded hover:text-slate-200"
                        >
                          {m.source}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <a
                  href={term.iri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-blue-400 hover:text-blue-300"
                >
                  OLS
                </a>
              </div>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
