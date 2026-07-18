/** NINDS NeuroMMSig molecular signatures. */

import { memo } from 'react'
import Link from 'next/link'
import type { NeuroMMSigSignature } from '@/lib/types'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { DataPoint } from '@/components/ui/DataPoint'

interface NindsNeurommsigPanelProps {
  data: NeuroMMSigSignature[]
  isLoading?: boolean
  panelId?: string
  lastFetched?: Date
}

export const NindsNeurommsigPanel = memo(function NindsNeurommsigPanel({
  data,
  isLoading,
  panelId = 'ninds-neurommsig',
  lastFetched,
}: NindsNeurommsigPanelProps) {
  const list = Array.isArray(data) ? data : []
  const isEmpty = !isLoading && list.length === 0

  return (
    <Panel
      title={
        isEmpty
          ? 'NINDS NeuroMMSig Signatures'
          : `NINDS NeuroMMSig Signatures (${list.length})`
      }
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isLoading
          ? 'Loading NeuroMMSig signatures…'
          : isEmpty
            ? 'No neurological disease signatures found for this molecule.'
            : undefined
      }
    >
      {!isEmpty && !isLoading && (
        <PaginatedList className="space-y-1">
          {list.map((sig, i) => {
            const diseaseHref = sig.disease
              ? `/disease?q=${encodeURIComponent(sig.disease)}`
              : undefined
            const discoverHref = sig.disease
              ? `/discover?q=${encodeURIComponent(sig.disease)}`
              : undefined
            return (
              <DataPoint
                key={`${sig.signatureId}-${i}`}
                sourceKey="ninds-neurommsig"
                label={sig.name}
                recordUrl="https://neurmmsig.scai.fraunhofer.de/"
                fetchedAt={lastFetched}
              >
                <div className="py-2 border-b border-slate-700/60 last:border-0 pr-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-100">{sig.name}</span>
                        {sig.signatureId && (
                          <span className="text-[10px] font-mono text-violet-300/90 bg-violet-900/20 border border-violet-800/40 px-1.5 py-0.5 rounded">
                            {sig.signatureId}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {diseaseHref ? (
                          <Link href={diseaseHref} className="text-indigo-300 hover:underline">
                            {sig.disease}
                          </Link>
                        ) : (
                          sig.disease
                        )}
                        {sig.mechanism ? ` · ${sig.mechanism}` : ''}
                      </p>
                      {sig.evidence && (
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                          {sig.evidence}
                        </p>
                      )}
                      {sig.genes?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {sig.genes.slice(0, 8).map((g) => (
                            <Link
                              key={g}
                              href={`/gene?q=${encodeURIComponent(g)}`}
                              className="text-[10px] font-mono bg-slate-800 text-violet-300 border border-slate-700 px-1.5 py-0.5 rounded hover:border-violet-600"
                            >
                              {g}
                            </Link>
                          ))}
                          {sig.genes.length > 8 && (
                            <span className="text-[10px] text-slate-600">
                              +{sig.genes.length - 8}
                            </span>
                          )}
                        </div>
                      )}
                      {sig.drugs?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {sig.drugs.slice(0, 6).map((d) => (
                            <Link
                              key={d}
                              href={`/molecule/name/${encodeURIComponent(d)}`}
                              className="text-[10px] bg-slate-800 text-cyan-300/90 border border-slate-700 px-1.5 py-0.5 rounded hover:border-cyan-700"
                            >
                              {d}
                            </Link>
                          ))}
                        </div>
                      )}
                      {(sig.publications?.length ?? 0) > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(sig.publications ?? []).slice(0, 3).map((p) => {
                            const pmid = String(p).replace(/^PMID:?\s*/i, '')
                            const isPmid = /^\d+$/.test(pmid)
                            return (
                              <a
                                key={p}
                                href={
                                  isPmid
                                    ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
                                    : p.startsWith('http')
                                      ? p
                                      : `https://doi.org/${p}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono text-violet-400 hover:text-violet-300"
                              >
                                {isPmid ? `PMID ${pmid}` : String(p).slice(0, 20)}
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1 text-[10px]">
                      <a
                        href="https://neurmmsig.scai.fraunhofer.de/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300"
                      >
                        NeuroMMSig ↗
                      </a>
                      {discoverHref && (
                        <Link
                          href={discoverHref}
                          className="text-emerald-500/80 hover:text-emerald-300"
                        >
                          Discover →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </DataPoint>
            )
          })}
        </PaginatedList>
      )}
    </Panel>
  )
})
