'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const UsCollegesPanel = memo(function UsCollegesPanel({
  colleges,
  panelId,
  lastFetched,
}: {
  colleges: UsCollege[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(colleges) ? colleges : []
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<UsCollege>((c) => c.name || ''),
      ...alphaSortOptions<UsCollege>((c) => c.state || ''),
    ],
    [],
  )

  return (
    <Panel
      title={list.length > 0 ? `US colleges (Scorecard) (${list.length})` : 'US colleges (Scorecard)'}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        list.length === 0
          ? 'No College Scorecard institutions matched grant institutes / query (free Dept of Ed data).'
          : undefined
      }
    >
      <div className="space-y-3">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          US colleges: College Scorecard (primary), OpenAlex US education if Scorecard empty, Urban
          IPEDS enrichment for address/phone when UNITID known. Free public data — not admissions
          advice.{' '}
          <a
            href="https://collegescorecard.ed.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Scorecard
          </a>
        </p>
        {list.length > 0 && (
          <FilterablePaginatedList
            items={list}
            getSearchText={(c) =>
              [c.name, c.city, c.state, c.ownership, c.predominantDegree, c.matchSource]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter colleges…"
            getKey={(c) => c.id}
            renderItem={(c) => (
              <div
                className="py-3 border-b border-slate-700/60 last:border-0"
                data-testid="us-college-row"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 text-sm">{c.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {[c.address, c.city, c.state, c.zip].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {[
                        c.ownership,
                        c.predominantDegree,
                        c.studentSize != null ? `${c.studentSize} students` : '',
                        c.phone,
                        c.source,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {c.matchSource && (
                      <p className="text-[10px] text-slate-500 mt-0.5">Match: {c.matchSource}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <a
                    href={c.scorecardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('other', c.scorecardUrl, {
                        panelId: panelId || 'us-colleges',
                        label: c.id,
                      })
                    }
                  >
                    College Scorecard
                  </a>
                  {c.schoolUrl && (
                    <a
                      href={c.schoolUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:underline"
                      onClick={() =>
                        onDeepLinkClick('other', c.schoolUrl!, {
                          panelId: panelId || 'us-colleges',
                          label: 'website',
                        })
                      }
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </div>
    </Panel>
  )
})
