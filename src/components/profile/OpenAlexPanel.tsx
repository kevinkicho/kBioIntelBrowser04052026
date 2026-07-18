'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { OpenAlexWork } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

export const OpenAlexPanel = memo(function OpenAlexPanel({ works, panelId, lastFetched }: { works: OpenAlexWork[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(works) ? works : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<OpenAlexWork>((w) => w.year, {
        newest: 'Newest year',
        oldest: 'Oldest year',
      }),
      ...numberSortOptions<OpenAlexWork>((w) => w.citationCount || 0, {
        high: 'Most cited',
        low: 'Least cited',
      }),
      ...alphaSortOptions<OpenAlexWork>((w) => w.title || ''),
    ],
    [],
  )

  return (
    <Panel
      title="OpenAlex Works"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No OpenAlex works found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(work) =>
            [work.title, work.year, work.type, String(work.citationCount)]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="date-desc"
          filterPlaceholder="Filter works (title, year, type…)"
          getKey={(work, i) => `${work.title}-${work.year}-${i}`}
          renderItem={(work) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                {work.year > 0 && (
                  <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded">
                    {work.year}
                  </span>
                )}
                <p className="font-semibold text-slate-100 text-sm">{work.title}</p>
              </div>

              <div className="flex items-center gap-2 mt-1">
                {work.type && (
                  <span className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded">
                    {work.type}
                  </span>
                )}
                {work.openAccessUrl && (
                  <a
                    href={work.openAccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 px-2 py-0.5 rounded hover:bg-emerald-900/60"
                  >
                    Open Access
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">
                  Citations: <span className="text-slate-200 font-mono">{work.citationCount}</span>
                </span>
                {work.url && (
                  <a
                    href={work.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    View work →
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
