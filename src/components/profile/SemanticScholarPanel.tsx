'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { SemanticPaper } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

export const SemanticScholarPanel = memo(function SemanticScholarPanel({ papers, panelId, lastFetched }: { papers: SemanticPaper[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(papers) ? papers : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<SemanticPaper>((p) => p.year, {
        newest: 'Newest year',
        oldest: 'Oldest year',
      }),
      ...numberSortOptions<SemanticPaper>((p) => p.citationCount || 0, {
        high: 'Most cited',
        low: 'Least cited',
      }),
      ...alphaSortOptions<SemanticPaper>((p) => p.title || ''),
    ],
    [],
  )

  return (
    <Panel
      title="Semantic Scholar"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No Semantic Scholar papers found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(paper) =>
            [paper.title, paper.year, paper.tldr, String(paper.citationCount)]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="date-desc"
          filterPlaceholder="Filter papers (title, year, TLDR…)"
          getKey={(paper, i) => `${paper.title}-${paper.year}-${i}`}
          renderItem={(paper) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                {paper.year && paper.year > 0 && (
                  <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded">
                    {paper.year}
                  </span>
                )}
                <p className="font-semibold text-slate-100 text-sm">{paper.title}</p>
              </div>

              {paper.tldr && (
                <p className="text-xs text-slate-400 mt-1">{paper.tldr}</p>
              )}

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">
                  Citations: <span className="text-slate-200 font-mono">{paper.citationCount}</span>
                </span>
                {paper.url && (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    View paper →
                  </a>
                )}
              </div>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
