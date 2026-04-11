import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GeneInfo } from '@/lib/types'

export const GeneInfoPanel = memo(function GeneInfoPanel({ genes, panelId, lastFetched }: { genes: GeneInfo[], panelId?: string, lastFetched?: Date }) {
  if (genes.length === 0) {
    return (
      <Panel title="NCBI Gene" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No gene information found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="NCBI Gene" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {genes.map((gene, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
                {gene.symbol}
              </span>
              {gene.chromosome && (
                <span className="text-xs text-slate-500 shrink-0">Chr {gene.chromosome}</span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-200 mt-1">{gene.name}</p>
            {gene.organism && (
              <p className="text-xs text-slate-400 mt-0.5 italic">{gene.organism}</p>
            )}
            {gene.summary && (
              <p className="text-xs text-slate-400 mt-1.5 line-clamp-3">{gene.summary}</p>
            )}
            <a
              href={gene.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
            >
              View in NCBI Gene →
            </a>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
