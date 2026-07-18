'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { NihGrant } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US')
}

export const NihReporterPanel = memo(function NihReporterPanel({
  grants,
  panelId,
  lastFetched,
}: {
  grants: NihGrant[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(grants) ? grants : []
  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<NihGrant>((g) => g.startDate || g.endDate, {
        newest: 'Newest start',
        oldest: 'Oldest start',
      }),
      ...numberSortOptions<NihGrant>((g) => g.fundingAmount || 0, {
        high: 'Largest award',
        low: 'Smallest award',
      }),
      ...alphaSortOptions<NihGrant>((g) => g.title || g.projectNumber),
    ],
    [],
  )

  if (list.length === 0) {
    return (
      <Panel
        title="NIH Grants"
        panelId={panelId}
        lastFetched={lastFetched}
        empty="No NIH grants found for this molecule."
      />
    )
  }

  return (
    <Panel
      title={`NIH Grants (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
    >
      <FilterablePaginatedList
        items={list}
        getSearchText={(g) =>
          [g.title, g.projectNumber, g.piName, g.institute, g.startDate, g.endDate]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="date-desc"
        filterPlaceholder="Filter grants (title, PI, institute, number…)"
        getKey={(g, i) => `${g.projectNumber}-${i}`}
        renderItem={(grant) => {
          const href = grant.projectNumber
            ? `https://reporter.nih.gov/search/${encodeURIComponent(grant.projectNumber)}`
            : 'https://reporter.nih.gov/'
          return (
            <div className="py-2 border-b border-slate-700/60 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-100 text-sm hover:text-purple-300"
                  >
                    {grant.title}
                  </a>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {[grant.piName, grant.institute].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {[
                      grant.startDate && `${grant.startDate} – ${grant.endDate || '…'}`,
                      grant.fundingAmount > 0 && `$${formatCurrency(grant.fundingAmount)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px] font-mono bg-purple-900/40 text-purple-300 border border-purple-700/30 px-1.5 py-0.5 rounded">
                    {grant.projectNumber}
                  </span>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-purple-400 hover:text-purple-300"
                  >
                    RePORTER ↗
                  </a>
                </div>
              </div>
            </div>
          )
        }}
      />
    </Panel>
  )
})
