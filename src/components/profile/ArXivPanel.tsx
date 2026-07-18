'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { ArXivPaper } from '@/lib/types'
import { alphaSortOptions, dateSortOptions } from '@/lib/listControls'

function PaperItem({ paper }: { paper: ArXivPaper }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={paper.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {paper.title}
        </a>
        <span className="text-xs bg-orange-900/40 text-orange-300 border border-orange-700/30 px-2 py-0.5 rounded shrink-0">
          arXiv
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {(paper.authors?.slice(0, 3) ?? []).join(', ')}
        {(paper.authors?.length ?? 0) > 3 && ` et al.`}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Published: {paper.publishedDate}
        {paper.updatedDate !== paper.publishedDate && ` • Updated: ${paper.updatedDate}`}
      </p>
      {paper.abstract && (
        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{paper.abstract}</p>
      )}
      {(paper.categories?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {(paper.categories ?? []).slice(0, 3).map((cat, i) => (
            <span key={`${cat}-${i}`} className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">
              {cat}
            </span>
          ))}
          {(paper.categories?.length ?? 0) > 3 && (
            <span className="text-xs text-slate-500">+{paper.categories.length - 3}</span>
          )}
        </div>
      )}
      <div className="flex gap-3 mt-2 text-xs">
        <a
          href={paper.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300"
        >
          Abstract
        </a>
        <a
          href={paper.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300"
        >
          PDF
        </a>
      </div>
    </div>
  )
}

export const ArXivPanel = memo(function ArXivPanel({ papers, panelId, lastFetched }: { papers: ArXivPaper[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = papers.length === 0
  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<ArXivPaper>((p) => p.publishedDate || p.updatedDate),
      ...alphaSortOptions<ArXivPaper>((p) => p.title),
    ],
    [],
  )

  return (
    <Panel
      title="arXiv"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No arXiv papers found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">Biology preprints from arXiv</p>
          <FilterablePaginatedList
            items={papers}
            getSearchText={(p) =>
              [p.title, p.arxivId, ...(p.authors ?? []), p.abstract, ...(p.categories ?? [])]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="date-desc"
            filterPlaceholder="Filter papers…"
            getKey={(p, i) => `${p.arxivId}-${i}`}
            className="space-y-3"
            renderItem={(paper) => <PaperItem paper={paper} />}
          />
        </>
      )}
    </Panel>
  )
})
