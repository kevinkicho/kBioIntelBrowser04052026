import { memo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { EnsemblGene } from '@/lib/types'

export const EnsemblPanel = memo(function EnsemblPanel({
  genes,
  panelId,
  lastFetched,
}: {
  genes: EnsemblGene[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(genes) ? genes : []
  const isEmpty = list.length === 0
  return (
    <Panel
      title={isEmpty ? 'Ensembl Genomics' : `Ensembl Genomics (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No Ensembl gene data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-1">
          {list.map((gene, i) => (
            <div
              key={`${gene.geneId || gene.symbol}-${i}`}
              className="py-2 border-b border-slate-700/60 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/gene?q=${encodeURIComponent(gene.symbol || gene.displayName || '')}`}
                      className="text-sm font-semibold font-mono text-cyan-300 hover:text-cyan-200"
                    >
                      {gene.displayName || gene.symbol || gene.geneId}
                    </Link>
                    {gene.biotype && (
                      <span className="text-[10px] bg-amber-900/40 text-amber-300 border border-amber-700/30 px-1.5 py-0.5 rounded">
                        {gene.biotype}
                      </span>
                    )}
                    {gene.geneId && (
                      <span className="text-[10px] font-mono text-slate-600">{gene.geneId}</span>
                    )}
                  </div>
                  {(gene.name || gene.symbol) && gene.name !== gene.displayName && (
                    <p className="mt-0.5 text-[11px] text-slate-400">{gene.name || gene.symbol}</p>
                  )}
                  <p className="mt-0.5 text-[11px] font-mono text-slate-500">
                    chr{gene.chromosome}:{gene.start?.toLocaleString?.() ?? gene.start}-
                    {gene.end?.toLocaleString?.() ?? gene.end}
                    {gene.strand != null ? ` (${gene.strand > 0 ? '+' : '−'})` : ''}
                  </p>
                  {gene.description && (
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-snug">
                      {gene.description}
                    </p>
                  )}
                </div>
                {gene.url && (
                  <a
                    href={gene.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] text-cyan-400 hover:text-cyan-300"
                  >
                    Ensembl ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
