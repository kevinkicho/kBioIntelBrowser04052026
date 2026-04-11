import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { NciConcept } from '@/lib/types'

export const NciThesaurusPanel = memo(function NciThesaurusPanel({ concepts, panelId, lastFetched }: { concepts: NciConcept[], panelId?: string, lastFetched?: Date }) {
  if (concepts.length === 0) {
    return (
      <Panel title="NCI Thesaurus" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No NCI Thesaurus concepts found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="NCI Thesaurus" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {concepts.map((concept, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded">
                {concept.code}
              </span>
              <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded">
                {concept.conceptStatus}
              </span>
            </div>
            <p className="text-sm text-slate-200 mt-1 font-medium">{concept.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">
                {concept.leaf ? 'Leaf node' : 'Branch node'}
              </span>
            </div>
            <a
              href={concept.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
            >
              View in NCI Thesaurus →
            </a>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
