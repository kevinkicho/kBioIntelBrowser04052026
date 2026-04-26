import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MedGenConcept } from '@/lib/types'

function ConceptItem({ concept }: { concept: MedGenConcept }) {
  // Safeguard: ensure name is a string
  const displayName = typeof concept.name === 'string' ? concept.name : String(concept.name || 'Unknown Concept')
  // Safeguard: ensure semanticTypes is an array
  const semanticTypes = Array.isArray(concept.semanticTypes) ? concept.semanticTypes : []
  // Safeguard: ensure definition is a string
  const definition = typeof concept.definition === 'string' ? concept.definition : String(concept.definition || '')
  // Safeguard: ensure omimIds is an array
  const omimIds = Array.isArray(concept.omimIds) ? concept.omimIds : []

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={concept.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {displayName}
        </a>
        <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded shrink-0">
          {concept.conceptId}
        </span>
      </div>
      {definition && (
        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{definition}</p>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        {semanticTypes.map((type, i) => (
          <span key={`${type}-${i}`} className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">
            {type}
          </span>
        ))}
      </div>
      {omimIds.length > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          OMIM: {omimIds.slice(0, 3).join(', ')}
          {omimIds.length > 3 && ` +${omimIds.length - 3} more`}
        </p>
      )}
    </div>
  )
}

export const MedGenPanel = memo(function MedGenPanel({ 
  concepts, 
  panelId, 
  lastFetched 
}: { 
  concepts: MedGenConcept[], 
  panelId?: string, 
  lastFetched?: Date 
}) {
  // Safeguard: ensure concepts is an array
  const safeConcepts = Array.isArray(concepts) ? concepts : []
  const isEmpty = safeConcepts.length === 0

  return (
    <Panel
      title="MedGen"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No MedGen concepts found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">Medical genetics concepts from NCBI</p>
          <PaginatedList className="space-y-3">
            {safeConcepts.map((concept, i) => (
              <ConceptItem key={`${concept.conceptId || i}-${i}`} concept={concept} />
            ))}
          </PaginatedList>
        </>
      )}
    </Panel>
  )
})
