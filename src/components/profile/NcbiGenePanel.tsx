import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GeneInfo } from '@/lib/types'

export const NcbiGenePanel = memo(function NcbiGenePanel({ genes, panelId, lastFetched }: { genes: GeneInfo[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = genes.length === 0
  return (
    <Panel
      title="NCBI Gene"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No NCBI Gene entries found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {genes.map((gene, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium text-slate-200">{gene.symbol}</h4>
                  <p className="text-xs text-slate-400">{gene.name}</p>
                </div>
                <span className="text-xs font-mono bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                  GeneID: {gene.geneId}
                </span>
              </div>
              {gene.summary && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{gene.summary}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-1">
                {gene.chromosome && (
                  <span className="text-xs text-slate-500">Chr: {gene.chromosome}</span>
                )}
                {gene.mapLocation && (
                  <span className="text-xs text-slate-500">Location: {gene.mapLocation}</span>
                )}
              </div>
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
      )}
    </Panel>
  )
})