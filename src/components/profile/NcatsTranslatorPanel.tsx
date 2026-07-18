/** NCATS Biomedical Translator associations. */

import { memo } from 'react'
import type { TranslatorAssociation } from '@/lib/types'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { DataPoint } from '@/components/ui/DataPoint'

interface NcatsTranslatorPanelProps {
  data: TranslatorAssociation[]
  isLoading?: boolean
  panelId?: string
  lastFetched?: Date
}

function searchUrl(term: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(term + ' biomedical')}`
}

export const NcatsTranslatorPanel = memo(function NcatsTranslatorPanel({
  data,
  isLoading,
  panelId = 'ncats-translator',
  lastFetched,
}: NcatsTranslatorPanelProps) {
  const list = Array.isArray(data) ? data : []
  const isEmpty = !isLoading && list.length === 0

  return (
    <Panel
      title={
        isEmpty
          ? 'NCATS Biomedical Translator'
          : `NCATS Biomedical Translator (${list.length})`
      }
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isLoading
          ? 'Loading Translator associations…'
          : isEmpty
            ? 'No biomedical associations found for this molecule.'
            : undefined
      }
    >
      {!isEmpty && !isLoading && (
        <PaginatedList className="space-y-1">
          {list.map((a, i) => {
            const label = a.edgeLabel || a.predicate || 'association'
            return (
              <DataPoint
                key={`${a.subject}-${a.object}-${i}`}
                sourceKey="ncats-translator"
                label={`${a.subject} → ${a.object}`}
                recordUrl="https://ncats.nih.gov/translator"
                fetchedAt={lastFetched}
              >
                <div className="py-2 border-b border-slate-700/60 last:border-0 pr-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <a
                      href={searchUrl(a.subject)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
                      title="Look up subject"
                    >
                      {a.subject}
                    </a>
                    <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/60">
                      {label}
                    </span>
                    <a
                      href={searchUrl(a.object)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-cyan-300 hover:text-cyan-200 hover:underline"
                      title="Look up object"
                    >
                      {a.object}
                    </a>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {[a.predicate !== label ? a.predicate : null, a.source]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {a.publications && a.publications.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.publications.slice(0, 4).map((p) => {
                        const pmid = String(p).replace(/^PMID:?\s*/i, '')
                        const isPmid = /^\d+$/.test(pmid)
                        const href = isPmid
                          ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
                          : p.startsWith('http')
                            ? p
                            : `https://doi.org/${p}`
                        return (
                          <a
                            key={p}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-violet-400 hover:text-violet-300"
                          >
                            {isPmid ? `PMID ${pmid}` : p.slice(0, 24)}
                          </a>
                        )
                      })}
                    </div>
                  )}
                  <div className="mt-1 flex gap-2 text-[10px]">
                    <a
                      href="https://ncats.nih.gov/translator"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-slate-300"
                    >
                      NCATS Translator ↗
                    </a>
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
