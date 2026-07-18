'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { OrangeBookEntry } from '@/lib/types'
import { alphaSortOptions, dateSortOptions } from '@/lib/listControls'

export const OrangeBookPanel = memo(function OrangeBookPanel({ entries, panelId, lastFetched }: { entries: OrangeBookEntry[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(entries) ? entries : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<OrangeBookEntry>((e) => e.approvalDate, {
        newest: 'Newest approval',
        oldest: 'Oldest approval',
      }),
      ...alphaSortOptions<OrangeBookEntry>((e) => e.sponsorName || ''),
      ...alphaSortOptions<OrangeBookEntry>((e) => e.applicationNumber || '').map((o) => ({
        ...o,
        id: `app-${o.id}`,
        label: o.id.includes('asc') ? 'Application A–Z' : 'Application Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="FDA Orange Book"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No Orange Book entries found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(entry) =>
            [
              entry.sponsorName,
              entry.applicationNumber,
              entry.dosageForm,
              entry.teCode,
              entry.approvalDate,
              ...(entry.patents?.map((p) => `${p.patentNumber} ${p.expiryDate}`) || []),
              ...(entry.exclusivities?.map((e) => `${e.code} ${e.expiryDate}`) || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="date-desc"
          filterPlaceholder="Filter entries (sponsor, application, TE…)"
          getKey={(entry, i) => `${entry.applicationNumber}-${i}`}
          renderItem={(entry) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">{entry.sponsorName}</p>
                <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
                  {entry.applicationNumber}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {entry.dosageForm && <span className="text-xs text-slate-400">{entry.dosageForm}</span>}
                {entry.teCode && (
                  <span className="text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 px-2 py-0.5 rounded">
                    TE: {entry.teCode}
                  </span>
                )}
              </div>
              {entry.approvalDate && (
                <p className="text-xs text-slate-500 mt-1">Approved: {entry.approvalDate}</p>
              )}
              {entry.patents && entry.patents.length > 0 && (
                <div className="mt-2 space-y-1">
                  {entry.patents.map((p, j) => (
                    <p key={j} className="text-xs text-slate-500">
                      Patent {p.patentNumber} — expires {p.expiryDate}
                    </p>
                  ))}
                </div>
              )}
              {entry.exclusivities && entry.exclusivities.length > 0 && (
                <div className="mt-1 space-y-1">
                  {entry.exclusivities.map((e, j) => (
                    <p key={j} className="text-xs text-amber-400">
                      Exclusivity {e.code} — expires {e.expiryDate}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        />
      )}
    </Panel>
  )
})
