import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GoAnnotation } from '@/lib/types'

function goAspectBadge(aspect: string): string {
  // Handle both goAspect from API and standard aspect values
  const normalizedAspect = aspect?.toLowerCase() || ''
  if (normalizedAspect.includes('biological') || normalizedAspect.includes('process')) {
    return 'bg-green-900/40 text-green-300 border-green-700/30'
  }
  if (normalizedAspect.includes('molecular') || normalizedAspect.includes('function')) {
    return 'bg-blue-900/40 text-blue-300 border-blue-700/30'
  }
  if (normalizedAspect.includes('cellular') || normalizedAspect.includes('component')) {
    return 'bg-purple-900/40 text-purple-300 border-purple-700/30'
  }
  return 'bg-slate-700/60 text-slate-300 border-slate-600/40'
}

function normalizeAspect(aspect: string): string {
  // Convert goAspect format (e.g., "biological_process") to readable format
  if (!aspect) return ''
  return aspect.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export const GeneOntologyPanel = memo(function GeneOntologyPanel({ 
  terms, 
  panelId, 
  lastFetched 
}: { 
  terms: GoAnnotation[], 
  panelId?: string, 
  lastFetched?: Date 
}) {
  // Handle non-array data
  if (!Array.isArray(terms)) {
    return (
      <Panel title="Gene Ontology Terms" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No Gene Ontology terms found.</p>
      </Panel>
    )
  }

  if (terms.length === 0) {
    return (
      <Panel title="Gene Ontology Terms" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No Gene Ontology terms found.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Gene Ontology Terms" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {terms.map((term, i) => (
          <div key={`${term.goId || i}-${i}`} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${goAspectBadge(term.goAspect)}`}>
                {normalizeAspect(term.goAspect)}
              </span>
              <a
                href={term.url || `https://amigo.geneontology.org/amigo/term/${term.goId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {term.goId}
              </a>
            </div>
            <p className="font-semibold text-slate-100 text-sm mt-1">{term.goName}</p>
            {term.qualifier && (
              <p className="text-xs text-slate-500 mt-1">Qualifier: {term.qualifier}</p>
            )}
            {term.evidence && (
              <p className="text-xs text-slate-500 mt-1">Evidence: {term.evidence}</p>
            )}
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
