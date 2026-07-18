import { memo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DisGeNetAssociation } from '@/lib/types'

interface DisGeNETPanelProps {
  associations?: DisGeNetAssociation[]
  panelId?: string
  lastFetched?: Date
}

export const DisGeNETPanel = memo(function DisGeNETPanel({
  associations,
  panelId,
  lastFetched,
}: DisGeNETPanelProps) {
  const list = Array.isArray(associations) ? associations : []
  const isEmpty = list.length === 0
  const title = isEmpty
    ? 'DisGeNET'
    : `DisGeNET Gene-Disease Associations (${list.length})`

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No disease-gene associations found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-1">
          {list.map((assoc, idx) => {
            const discoverHref = `/discover?q=${encodeURIComponent(assoc.diseaseName)}`
            const disgenetUrl = assoc.diseaseId
              ? `https://www.disgenet.org/browser/0/1/${assoc.diseaseId}/`
              : `https://www.disgenet.org/search?q=${encodeURIComponent(assoc.diseaseName)}`
            return (
              <div
                key={`${assoc.diseaseId}-${assoc.geneSymbol}-${idx}`}
                className="py-2 border-b border-slate-700/60 last:border-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/disease?q=${encodeURIComponent(assoc.diseaseName)}`}
                        className="text-sm font-medium text-slate-100 hover:text-indigo-300"
                      >
                        {assoc.diseaseName}
                      </Link>
                      {assoc.diseaseType && (
                        <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">
                          {assoc.diseaseType}
                        </span>
                      )}
                      {assoc.source && (
                        <span className="text-[10px] bg-blue-900/40 text-blue-300 border border-blue-800/40 px-1.5 py-0.5 rounded">
                          {assoc.source}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      {assoc.geneSymbol && (
                        <Link
                          href={`/gene?q=${encodeURIComponent(assoc.geneSymbol)}`}
                          className="text-violet-300 hover:underline font-mono"
                        >
                          {assoc.geneSymbol}
                        </Link>
                      )}
                      {assoc.geneId && <span>GeneID {assoc.geneId}</span>}
                      {assoc.diseaseId && (
                        <span className="font-mono text-slate-600">{assoc.diseaseId}</span>
                      )}
                    </p>
                    {assoc.pmids?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {assoc.pmids.slice(0, 4).map((pmid) => (
                          <a
                            key={pmid}
                            href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-violet-400/90 hover:text-violet-300 font-mono"
                          >
                            PMID {pmid}
                          </a>
                        ))}
                        {assoc.pmids.length > 4 && (
                          <span className="text-[10px] text-slate-600">
                            +{assoc.pmids.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {typeof assoc.score === 'number' && (
                      <span className="text-xs tabular-nums font-mono text-emerald-300 bg-emerald-900/30 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                        {assoc.score.toFixed(3)}
                      </span>
                    )}
                    {assoc.confidenceScore != null && (
                      <span className="text-[10px] text-slate-600">
                        conf {assoc.confidenceScore.toFixed(2)}
                      </span>
                    )}
                    <a
                      href={disgenetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300"
                    >
                      DisGeNET ↗
                    </a>
                    <Link
                      href={discoverHref}
                      className="text-[10px] text-emerald-500/80 hover:text-emerald-300"
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
