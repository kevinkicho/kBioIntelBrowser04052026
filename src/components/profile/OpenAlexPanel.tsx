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
import {
  openAlexTypeLabel,
  openAlexWorkDeepLink,
} from '@/lib/openalexLinks'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const OpenAlexPanel = memo(function OpenAlexPanel({
  works,
  panelId,
  lastFetched,
}: {
  works: OpenAlexWork[]
  panelId?: string
  lastFetched?: Date
}) {
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
        <>
          <p className="mb-2 text-[10px] text-slate-600 leading-relaxed">
            Click a work type chip (e.g. article) or title to open that record for review.
          </p>
          <FilterablePaginatedList
            items={list}
            getSearchText={(work) =>
              [
                work.title,
                work.year,
                work.type,
                work.journal,
                work.doi,
                ...(work.authors || []),
                String(work.citationCount),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="date-desc"
            filterPlaceholder="Filter works (title, year, type…)"
            getKey={(work, i) => `${work.workId || work.title}-${work.year}-${i}`}
            renderItem={(work) => {
              const href = openAlexWorkDeepLink(work)
              const typeLabel = openAlexTypeLabel(work.type)
              const track = (label: string) => {
                if (!href) return
                onDeepLinkClick('openalex', href, {
                  panelId: 'open-alex',
                  label,
                })
              }

              return (
                <div className="py-3 border-b border-slate-700 last:border-0">
                  <div className="flex items-start gap-2 mb-1">
                    {work.year > 0 && (
                      <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded shrink-0">
                        {work.year}
                      </span>
                    )}
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open work: ${work.title}`}
                        onClick={() => track(work.title)}
                        className="font-semibold text-slate-100 text-sm hover:text-cyan-300 leading-snug"
                      >
                        {work.title}
                      </a>
                    ) : (
                      <p className="font-semibold text-slate-100 text-sm">{work.title}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {work.type &&
                      (href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Open this ${typeLabel} for review`}
                          onClick={() => track(`${typeLabel}:${work.title}`)}
                          className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded hover:bg-violet-800/50 hover:text-violet-200 hover:border-violet-600/40 transition-colors capitalize"
                          data-testid="openalex-type-chip"
                        >
                          {typeLabel}
                        </a>
                      ) : (
                        <span className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded capitalize">
                          {typeLabel}
                        </span>
                      ))}
                    {work.openAccessUrl && (
                      <a
                        href={work.openAccessUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open access full text"
                        onClick={() =>
                          onDeepLinkClick('openalex', work.openAccessUrl!, {
                            panelId: 'open-alex',
                            label: `oa:${work.title}`,
                          })
                        }
                        className="text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 px-2 py-0.5 rounded hover:bg-emerald-900/60"
                      >
                        Open Access
                      </a>
                    )}
                    {work.journal && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[14rem]" title={work.journal}>
                        {work.journal}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-xs text-slate-400">
                      Citations:{' '}
                      <span className="text-slate-200 font-mono">{work.citationCount}</span>
                    </span>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track(work.title)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
                      >
                        View work →
                      </a>
                    )}
                  </div>
                </div>
              )
            }}
          />
        </>
      )}
    </Panel>
  )
})
