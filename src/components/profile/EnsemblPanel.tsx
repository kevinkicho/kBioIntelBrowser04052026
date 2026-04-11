import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { EnsemblGene } from '@/lib/types'

export const EnsemblPanel = memo(function EnsemblPanel({ genes, panelId, lastFetched }: { genes: EnsemblGene[], panelId?: string, lastFetched?: Date }) {
  if (genes.length === 0) {
    return (
      <Panel title="Ensembl Genomics" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No Ensembl gene data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Ensembl Genomics" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {genes.map((gene, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded">
                  {gene.displayName}
                </span>
                <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/30 px-2 py-0.5 rounded">
                  {gene.biotype}
                </span>
              </div>
              <a
                href={gene.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
              >
                Ensembl →
              </a>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              chr{gene.chromosome}:{gene.start.toLocaleString()}-{gene.end.toLocaleString()} ({gene.strand > 0 ? '+' : '-'} strand)
            </p>

            {gene.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{gene.description}</p>
            )}
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
