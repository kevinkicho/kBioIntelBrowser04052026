'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { DrugsFdaApplication } from '@/lib/api/drugsFda'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { DescriptionTip, ExternalLinkTip } from '@/components/ui/HelperTip'

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
          renderItem={(e) => {
            const meta = [
              e.genericName && `Generic: ${e.genericName}`,
              e.sponsorName && `Sponsor: ${e.sponsorName}`,
              e.submissionType,
              e.approvalDate && `Status date: ${e.approvalDate}`,
              e.products[0]?.marketingStatus,
            ]
              .filter(Boolean)
              .join('\n')
            return (
              <div className="border-b border-slate-700 py-2 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-100">{e.brandName}</p>
                  <span className="shrink-0 rounded border border-cyan-800/40 bg-cyan-950/40 px-2 py-0.5 font-mono text-[10px] text-cyan-200">
                    {e.applicationNumber}
                  </span>
                  <DescriptionTip text={meta} label="Details" />
                  <ExternalLinkTip
                    href={e.drugsAtFdaUrl}
                    label="Drugs@FDA"
                    title={`Open Drugs@FDA overview for ${e.applicationNumber}`}
                    testId={`drugs-fda-link-${e.applicationNumber}`}
                    onClick={() =>
                      onDeepLinkClick('drugs-fda', e.drugsAtFdaUrl, {
                        panelId: panelId || 'drugs-fda',
                        label: e.applicationNumber,
                      })
                    }
                  />
                </div>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
