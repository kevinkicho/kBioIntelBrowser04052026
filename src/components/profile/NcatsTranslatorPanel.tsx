/** NCATS Biomedical Translator associations. */

'use client'

import { memo, useMemo } from 'react'
import type { TranslatorAssociation } from '@/lib/types'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { DataPoint } from '@/components/ui/DataPoint'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { alphaSortOptions } from '@/lib/listControls'

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

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<TranslatorAssociation>((a) => a.subject || ''),
      ...alphaSortOptions<TranslatorAssociation>((a) => a.object || '').map((o) => ({
        ...o,
        id: `object-${o.id}`,
        label: o.id.includes('asc') ? 'Object A–Z' : 'Object Z–A',
      })),
      ...alphaSortOptions<TranslatorAssociation>(
        (a) => a.edgeLabel || a.predicate || '',
      ).map((o) => ({
        ...o,
        id: `pred-${o.id}`,
        label: o.id.includes('asc') ? 'Predicate A–Z' : 'Predicate Z–A',
      })),
    ],
    [],
  )

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
        <FilterablePaginatedList
          items={list}
          getSearchText={(a) =>
            [
              a.subject,
              a.object,
              a.edgeLabel,
              a.predicate,
              a.source,
              ...(a.publications || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter associations (subject, object, predicate…)"
          getKey={(a, i) => `${a.subject}-${a.object}-${i}`}
          renderItem={(a) => {
            const label = a.edgeLabel || a.predicate || 'association'
            return (
              <DataPoint
                sourceKey="ncats-translator"
                label={`${a.subject} → ${a.object}`}
                recordUrl="https://ncats.nih.gov/translator"
                fetchedAt={lastFetched}
              >
                <div className="py-2 border-b border-slate-700/60 last:border-0 pr-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <StyledTooltip content="Look up subject">
                      <a
                        href={searchUrl(a.subject)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
                      >
                        {a.subject}
                      </a>
                    </StyledTooltip>
                    <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/60">
                      {label}
                    </span>
                    <StyledTooltip content="Look up object">
                      <a
                        href={searchUrl(a.object)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-cyan-300 hover:text-cyan-200 hover:underline"
                      >
                        {a.object}
                      </a>
                    </StyledTooltip>
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
          }}
        />
      )}
    </Panel>
  )
})
