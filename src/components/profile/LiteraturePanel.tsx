'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { LiteratureResult } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

function LiteratureItem({ paper }: { paper: LiteratureResult }) {
  return (
    <div className="py-2 border-b border-slate-700/60 last:border-0">
      <p className="font-semibold text-slate-100 text-sm leading-snug">{paper.title}</p>
      {paper.authors && (
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{paper.authors}</p>
      )}
      <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-slate-500">
        {paper.journal && <span>{paper.journal}</span>}
        {paper.year > 0 && <span className="font-mono">{paper.year}</span>}
        {paper.citedByCount !== undefined && paper.citedByCount > 0 && (
          <span className="text-[10px] bg-blue-900/40 text-blue-300 border border-blue-700/30 px-1.5 py-0.5 rounded">
            {paper.citedByCount} cited
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
        {paper.doi && (
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            DOI ↗
          </a>
        )}
        {paper.pmid && (
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            PubMed ↗
          </a>
        )}
      </div>
    </div>
  )
}

export const LiteraturePanel = memo(function LiteraturePanel({
  results,
  panelId,
  lastFetched,
}: {
  results: LiteratureResult[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(results) ? results : []
  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<LiteratureResult>((p) => p.year, {
        newest: 'Newest year',
        oldest: 'Oldest year',
      }),
      ...numberSortOptions<LiteratureResult>((p) => p.citedByCount ?? 0, {
        high: 'Most cited',
        low: 'Least cited',
      }),
      ...alphaSortOptions<LiteratureResult>((p) => p.title || ''),
    ],
    [],
  )

  if (list.length === 0) {
    return (
      <Panel
        title="Scientific Literature (Europe PMC)"
        panelId={panelId}
        lastFetched={lastFetched}
      >
        <p className="text-slate-500 text-sm">No publications found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel
      title={`Scientific Literature (Europe PMC) (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
    >
      <FilterablePaginatedList
        items={list}
        getSearchText={(p) =>
          [p.title, p.authors, p.journal, p.doi, p.pmid, String(p.year || '')]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="date-desc"
        filterPlaceholder="Filter papers (title, author, journal, DOI…)"
        getKey={(p, i) => `${p.doi || p.pmid || p.title}-${i}`}
        renderItem={(paper) => <LiteratureItem paper={paper} />}
      />
    </Panel>
  )
})
