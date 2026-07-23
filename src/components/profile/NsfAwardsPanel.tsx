'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { NsfAward } from '@/lib/api/nsfAwards'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const NsfAwardsPanel = memo(function NsfAwardsPanel({
  awards,
  panelId,
  lastFetched,
}: {
  awards: NsfAward[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(awards) ? awards : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<NsfAward>((a) => a.amount ?? 0, {
        high: 'Amount high→low',
        low: 'Amount low→high',
        idPrefix: 'amt',
      }),
      ...alphaSortOptions<NsfAward>((a) => a.organization || ''),
      ...alphaSortOptions<NsfAward>((a) => a.title || ''),
    ],
    [],
  )

  return (
    <Panel
      title="NSF awards"
      panelId={panelId}
      lastFetched={lastFetched}
      help="Free NSF Awards API — funding context only, not a completeness graph of all research."
      empty={isEmpty ? 'No NSF awards matched this name keyword.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(a) =>
            [a.id, a.title, a.piName, a.organization, a.abstract].filter(Boolean).join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="amt-high"
          filterPlaceholder="Filter awards (PI, org, title)…"
          getKey={(a) => a.id || a.title}
          renderItem={(a) => (
            <div className="border-b border-slate-700 py-3 last:border-0">
              <p className="text-sm font-semibold text-slate-100 leading-snug">{a.title}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                <span>{a.piName}</span>
                <span>{a.organization}</span>
                {a.amount != null && (
                  <span className="tabular-nums text-emerald-300/90">
                    ${Math.round(a.amount).toLocaleString()}
                  </span>
                )}
                {a.id && (
                  <span className="font-mono text-[10px] text-slate-500">#{a.id}</span>
                )}
              </div>
              {(a.startDate || a.endDate) && (
                <p className="mt-0.5 text-[10px] text-slate-600">
                  {[a.startDate, a.endDate].filter(Boolean).join(' → ')}
                </p>
              )}
              {a.abstract && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 line-clamp-3">
                  {a.abstract}
                </p>
              )}
              <a
                href={a.awardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-[11px] text-indigo-400 hover:underline"
                onClick={() =>
                  onDeepLinkClick('nsf-awards', a.awardUrl, {
                    panelId: panelId || 'nsf-awards',
                    label: a.id,
                  })
                }
              >
                Open NSF award
              </a>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
