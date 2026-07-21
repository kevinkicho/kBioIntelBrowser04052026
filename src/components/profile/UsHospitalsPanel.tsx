'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const UsHospitalsPanel = memo(function UsHospitalsPanel({
  hospitals,
  panelId,
  lastFetched,
}: {
  hospitals: CmsHospital[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(hospitals) ? hospitals : []
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<CmsHospital>((h) => h.facilityName || ''),
      ...alphaSortOptions<CmsHospital>((h) => h.state || ''),
    ],
    [],
  )

  return (
    <Panel
      title={list.length > 0 ? `US hospitals (CMS) (${list.length})` : 'US hospitals (CMS)'}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        list.length === 0
          ? 'No Medicare-registered hospitals matched trial facility / sponsor names (CMS free dataset).'
          : undefined
      }
    >
      <div className="space-y-3">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          CMS Hospital General Information (Medicare-registered US hospitals). Ratings are public
          Care Compare fields — not a treatment recommendation or referral.{' '}
          <a
            href="https://data.cms.gov/provider-data/dataset/xubh-q36u"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Dataset
          </a>
        </p>
        {list.length > 0 && (
          <FilterablePaginatedList
            items={list}
            getSearchText={(h) =>
              [
                h.facilityName,
                h.city,
                h.state,
                h.hospitalType,
                h.ownership,
                h.facilityId,
                h.matchSource,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter hospitals…"
            getKey={(h, i) => `${h.facilityId}-${i}`}
            renderItem={(h) => (
              <div
                className="py-3 border-b border-slate-700/60 last:border-0"
                data-testid="cms-hospital-row"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 text-sm">{h.facilityName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {[h.address, h.city, h.state, h.zip].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {[h.hospitalType, h.ownership, h.phone].filter(Boolean).join(' · ')}
                    </p>
                    {h.matchSource && (
                      <p className="text-[10px] text-slate-500 mt-0.5">Match: {h.matchSource}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {h.facilityId && (
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-600 px-2 py-0.5 rounded">
                        CCN {h.facilityId}
                      </span>
                    )}
                    {h.overallRating && h.overallRating !== 'Not Available' && (
                      <span className="text-[9px] rounded border border-emerald-800/40 bg-emerald-950/30 text-emerald-300 px-1.5 py-0.5">
                        rating {h.overallRating}/5
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={h.careCompareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-[10px] text-indigo-400 hover:underline"
                  onClick={() =>
                    onDeepLinkClick('other', h.careCompareUrl, {
                      panelId: panelId || 'us-hospitals',
                      label: h.facilityId || h.facilityName.slice(0, 40),
                    })
                  }
                >
                  Medicare Care Compare
                </a>
              </div>
            )}
          />
        )}
      </div>
    </Panel>
  )
})
