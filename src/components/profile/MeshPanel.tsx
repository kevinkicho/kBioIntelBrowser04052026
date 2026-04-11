import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MeshTerm } from '@/lib/types'

export const MeshPanel = memo(function MeshPanel({ terms, panelId, lastFetched }: { terms: MeshTerm[], panelId?: string, lastFetched?: Date }) {
  if (terms.length === 0) {
    return (
      <Panel title="MeSH Terms (NLM)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No MeSH term data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="MeSH Terms (NLM)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {terms.map((term, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-100 text-sm">{term.name}</p>
              <a
                href={term.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
              >
                MeSH Browser →
              </a>
            </div>

            {term.scopeNote && (
              <p className="text-xs text-slate-400 mt-1">
                {term.scopeNote.length > 200
                  ? `${term.scopeNote.slice(0, 200)}...`
                  : term.scopeNote}
              </p>
            )}

            {term.treeNumbers.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {term.treeNumbers.map((tn, j) => (
                  <span
                    key={j}
                    className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded"
                  >
                    {tn}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
