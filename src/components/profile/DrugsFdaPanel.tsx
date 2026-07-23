'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { DrugsFdaApplication } from '@/lib/api/drugsFda'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const DrugsFdaPanel = memo(function DrugsFdaPanel({
  applications,
  panelId,
  lastFetched,
}: {
  applications: DrugsFdaApplication[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(applications) ? applications : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<DrugsFdaApplication>((e) => e.sponsorName || ''),
      ...alphaSortOptions<DrugsFdaApplication>((e) => e.applicationNumber || '').map((o) => ({
        ...o,
        id: `app-${o.id}`,
        label: o.id.includes('asc') ? 'Application A–Z' : 'Application Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="FDA Drugs@FDA applications"
      panelId={panelId}
      lastFetched={lastFetched}
      help="Free openFDA Drugs@FDA — application / product registry facts, not treatment advice."
      empty={isEmpty ? 'No Drugs@FDA applications found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(e) =>
            [e.applicationNumber, e.sponsorName, e.brandName, e.genericName, e.submissionType]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="alpha-asc"
          filterPlaceholder="Filter by sponsor, app number, brand…"
          getKey={(e) => e.applicationNumber}
          renderItem={(e) => (
            <div className="border-b border-slate-700 py-3 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{e.brandName}</p>
                  {e.genericName && (
                    <p className="text-[11px] text-slate-400">{e.genericName}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-slate-500">{e.sponsorName}</p>
                </div>
                <span className="shrink-0 rounded border border-cyan-800/40 bg-cyan-950/40 px-2 py-0.5 font-mono text-[10px] text-cyan-200">
                  {e.applicationNumber}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                {e.submissionType && (
                  <span className="rounded border border-slate-700 px-1.5 py-0.5">
                    {e.submissionType}
                  </span>
                )}
                {e.approvalDate && <span>Status date: {e.approvalDate}</span>}
                {e.products[0]?.marketingStatus && (
                  <span>{e.products[0].marketingStatus}</span>
                )}
              </div>
              <a
                href={e.drugsAtFdaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-[11px] text-indigo-400 hover:underline"
                onClick={() =>
                  onDeepLinkClick('drugs-fda', e.drugsAtFdaUrl, {
                    panelId: panelId || 'drugs-fda',
                    label: e.applicationNumber,
                  })
                }
              >
                Open Drugs@FDA overview
              </a>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
