import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { OLSTerm } from '@/lib/types'

function ontologyBadge(ontologyId: string): string {
  const colors: Record<string, string> = {
    'GO': 'bg-blue-900/40 text-blue-300 border-blue-700/30',
    'HP': 'bg-green-900/40 text-green-300 border-green-700/30',
    'MONDO': 'bg-purple-900/40 text-purple-300 border-purple-700/30',
    'UBERON': 'bg-amber-900/40 text-amber-300 border-amber-700/30',
    'CL': 'bg-red-900/40 text-red-300 border-red-700/30',
    'CHEBI': 'bg-pink-900/40 text-pink-300 border-pink-700/30',
    'DOID': 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
  }
  return colors[ontologyId] || 'bg-slate-700/60 text-slate-300 border-slate-600/40'
}

export const OLSPanel = memo(function OLSPanel({ terms, panelId, lastFetched }: { terms: OLSTerm[], panelId?: string, lastFetched?: Date }) {
  if (terms.length === 0) {
    return (
      <Panel title="Ontology Lookup Service" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No ontology terms found.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Ontology Lookup Service" panelId={panelId} lastFetched={lastFetched}>
      <div className="mb-3 text-xs text-slate-400">
        Terms from 270+ biomedical ontologies
      </div>
      <PaginatedList className="space-y-3">
        {terms.map((term, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${ontologyBadge(term.ontologyId)}`}>
                {term.ontologyId}
              </span>
            </div>
            <p className="font-semibold text-slate-100 text-sm mt-1">{term.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{term.iri}</p>
            {term.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{term.description}</p>
            )}
            {term.synonyms.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">Synonyms: {term.synonyms.slice(0, 3).join(', ')}</p>
            )}
            {term.mappings.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {term.mappings.slice(0, 5).map((m, j) => (
                  <a
                    key={j}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-slate-700/50 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded hover:bg-slate-600/50"
                  >
                    {m.source}
                  </a>
                ))}
              </div>
            )}
            <a
              href={term.iri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
            >
              View on OLS →
            </a>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
