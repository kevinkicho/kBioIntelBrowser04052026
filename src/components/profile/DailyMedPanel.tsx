'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { DrugLabel } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
} from '@/lib/listControls'
import { dailyMedRowDeepLink, dailyMedRowTitle } from '@/lib/dailymedLinks'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const DailyMedPanel = memo(function DailyMedPanel({
  labels,
  panelId,
  lastFetched,
}: {
  labels: DrugLabel[]
  panelId?: string
  lastFetched?: Date
}) {
  const isEmpty = !Array.isArray(labels) || labels.length === 0
  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<DrugLabel>((l) => l.publishedDate || l.date, {
        newest: 'Newest published',
        oldest: 'Oldest published',
      }),
      ...alphaSortOptions<DrugLabel>((l) => l.title || ''),
      ...alphaSortOptions<DrugLabel>((l) => l.labelerName || '').map((o) => ({
        ...o,
        id: `labeler-${o.id}`,
        label: o.id === 'name-asc' ? 'Labeler A–Z' : 'Labeler Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="Drug Labels (DailyMed)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No drug label found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <>
          <p className="mb-2 text-[10px] text-slate-600 leading-relaxed">
            FDA Structured Product Labels via DailyMed. Click a row to open that label on DailyMed
            (setid deep link).
          </p>
          <FilterablePaginatedList
            items={labels}
            getSearchText={(label) =>
              [
                label.title,
                label.labelerName,
                label.dosageForm,
                label.route,
                label.publishedDate,
                label.date,
                label.setId,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="date-desc"
            filterPlaceholder="Filter labels…"
            getKey={(label, i) => label.setId || label.title || String(i)}
            pageSize={5}
            className="space-y-0"
            renderItem={(label, index) => {
              const href = dailyMedRowDeepLink({
                setId: label.setId,
                dailyMedUrl: label.dailyMedUrl,
                url: label.url,
                title: label.title,
              })
              const title = dailyMedRowTitle({ setId: label.setId, title: label.title })
              return (
                <div>
                  {index === 0 && (
                    <div
                      className="grid grid-cols-[minmax(0,1.5fr)_minmax(5rem,0.7fr)_minmax(4rem,0.5fr)] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                      role="row"
                    >
                      <span>Label</span>
                      <span>Form / route</span>
                      <span>Published</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={title}
                    data-testid={`dailymed-row-${label.setId || index}`}
                    onClick={() =>
                      onDeepLinkClick('dailymed', href, {
                        panelId: 'dailymed',
                        label: label.setId || label.title,
                      })
                    }
                    className="grid grid-cols-[minmax(0,1.5fr)_minmax(5rem,0.7fr)_minmax(4rem,0.5fr)] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-100 group-hover:text-cyan-200 line-clamp-2 block">
                        {label.title || 'Untitled label'}
                      </span>
                      {label.labelerName && (
                        <span className="text-[10px] text-slate-500 truncate block">
                          {label.labelerName}
                        </span>
                      )}
                      {label.setId && (
                        <span className="text-[9px] font-mono text-slate-600 truncate block">
                          setid {label.setId}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">
                      {[label.dosageForm, label.route].filter(Boolean).join(' · ') || '—'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                      {label.publishedDate || label.date || '—'}
                    </span>
                  </a>
                </div>
              )
            }}
          />
        </>
      )}
    </Panel>
  )
})
