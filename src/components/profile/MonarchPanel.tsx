import { memo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MonarchDisease } from '@/lib/types'

export const MonarchPanel = memo(function MonarchPanel({
  diseases,
  panelId,
  lastFetched,
}: {
  diseases: MonarchDisease[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(diseases) ? diseases : []
  const isEmpty = list.length === 0
  return (
    <Panel
      title={isEmpty ? 'Disease Associations (Monarch)' : `Disease Associations (Monarch) (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No Monarch disease associations found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-1">
          {list.map((disease, i) => {
            const name = disease.name || disease.diseaseName
            const id = disease.id || disease.diseaseId
            return (
              <div
                key={`${id}-${i}`}
                className="py-2 border-b border-slate-700/60 last:border-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/disease?q=${encodeURIComponent(name)}`}
                        className="text-sm font-medium text-slate-100 hover:text-indigo-300"
                      >
                        {name}
                      </Link>
                      {id && (
                        <span className="text-[10px] font-mono bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-1.5 py-0.5 rounded">
                          {id}
                        </span>
                      )}
                      {disease.source && (
                        <span className="text-[9px] uppercase tracking-wide text-slate-600">
                          {disease.source}
                        </span>
                      )}
                    </div>
                    {(disease.geneSymbol || disease.evidence || disease.phenotypeCount) && (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {[
                          disease.geneSymbol && `Gene: ${disease.geneSymbol}`,
                          disease.evidence && `Evidence: ${disease.evidence}`,
                          disease.phenotypeCount != null &&
                            disease.phenotypeCount > 0 &&
                            `${disease.phenotypeCount} phenotypes`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {disease.description && (
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-snug">
                        {disease.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1 text-[10px]">
                    {disease.url && (
                      <a
                        href={disease.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        Monarch ↗
                      </a>
                    )}
                    {disease.pubmedId && (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${disease.pubmedId}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-violet-300"
                      >
                        PMID {disease.pubmedId}
                      </a>
                    )}
                    <Link
                      href={`/discover?q=${encodeURIComponent(name)}`}
                      className="text-emerald-500/80 hover:text-emerald-300"
                    >
                      Discover →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </PaginatedList>
      )}
    </Panel>
  )
})
