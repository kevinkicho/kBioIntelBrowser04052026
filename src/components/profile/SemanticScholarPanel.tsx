import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { SemanticPaper } from '@/lib/types'

export const SemanticScholarPanel = memo(function SemanticScholarPanel({ papers, panelId, lastFetched }: { papers: SemanticPaper[], panelId?: string, lastFetched?: Date }) {
  if (papers.length === 0) {
    return (
      <Panel title="Semantic Scholar" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No Semantic Scholar papers found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Semantic Scholar" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {papers.map((paper, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              {paper.year && paper.year > 0 && (
                <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded">
                  {paper.year}
                </span>
              )}
              <p className="font-semibold text-slate-100 text-sm">{paper.title}</p>
            </div>

            {paper.tldr && (
              <p className="text-xs text-slate-400 mt-1">{paper.tldr}</p>
            )}

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-400">
                Citations: <span className="text-slate-200 font-mono">{paper.citationCount}</span>
              </span>
              {paper.url && (
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                >
                  View paper →
                </a>
              )}
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
