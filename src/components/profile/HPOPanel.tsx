import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { HPOTerm } from '@/lib/types'

export const HPOPanel = memo(function HPOPanel({ 
  terms, 
  panelId, 
  lastFetched 
}: { 
  terms: HPOTerm[], 
  panelId?: string, 
  lastFetched?: Date 
}) {
  // Safeguard: ensure terms is an array
  const safeTerms = Array.isArray(terms) ? terms : []
  const isEmpty = safeTerms.length === 0

  return (
    <Panel
      title="Human Phenotype Ontology"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No HPO terms found." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {safeTerms.map((term, i) => (
            <div key={`${term.id || i}-${i}`} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <a
                  href={`https://hpo.jax.org/app/web/term/${term.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {term.id}
                </a>
              </div>
              <p className="font-semibold text-slate-100 text-sm mt-1">{term.name}</p>
              {term.definition && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{term.definition}</p>
              )}
              {term.synonyms && term.synonyms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {term.synonyms.slice(0, 3).map((syn, j) => (
                    <span key={j} className="text-xs bg-slate-700/40 text-slate-400 px-1.5 py-0.5 rounded">
                      {syn}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
