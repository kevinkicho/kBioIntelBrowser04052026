import { memo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GeneInfo } from '@/lib/types'

export const GeneInfoPanel = memo(function GeneInfoPanel({
  genes,
  panelId,
  lastFetched,
}: {
  genes: GeneInfo[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(genes) ? genes : []
  const isEmpty = list.length === 0
  return (
    <Panel
      title={isEmpty ? 'NCBI Gene' : `NCBI Gene (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No gene information found for this molecule.' : undefined}
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
                      href={
                        gene.geneId
                          ? `/gene/${gene.geneId}-${gene.symbol}`
                          : `/gene?q=${encodeURIComponent(gene.symbol)}`
                      }
                      className="text-sm font-semibold font-mono text-cyan-300 hover:text-cyan-200"
                    >
                      {gene.symbol}
                    </Link>
                    {gene.geneId && (
                      <span className="text-[10px] font-mono text-slate-600">
                        Entrez {gene.geneId}
                      </span>
                    )}
                    {gene.chromosome && (
                      <span className="text-[10px] text-slate-500">chr {gene.chromosome}</span>
                    )}
                    {gene.mapLocation && gene.mapLocation !== gene.chromosome && (
                      <span className="text-[10px] text-slate-600">{gene.mapLocation}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-300">{gene.name}</p>
                  {gene.organism && (
                    <p className="text-[10px] text-slate-600 italic">{gene.organism}</p>
                  )}
                  {gene.summary && (
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-3 leading-snug">
                      {gene.summary}
                    </p>
                  )}
                </div>
                {gene.url && (
                  <a
                    href={gene.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] text-blue-400 hover:text-blue-300"
                  >
                    NCBI ↗
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
