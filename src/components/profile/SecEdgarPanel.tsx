'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { SecFiling } from '@/lib/types'
import { alphaSortOptions, dateSortOptions } from '@/lib/listControls'

export const SecEdgarPanel = memo(function SecEdgarPanel({ filings, panelId, lastFetched }: { filings: SecFiling[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(filings) ? filings : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<SecFiling>((f) => f.filingDate, {
        newest: 'Newest filing',
        oldest: 'Oldest filing',
      }),
      ...alphaSortOptions<SecFiling>((f) => f.companyName || ''),
      ...alphaSortOptions<SecFiling>((f) => f.formType || '').map((o) => ({
        ...o,
        id: `form-${o.id}`,
        label: o.id.includes('asc') ? 'Form A–Z' : 'Form Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="SEC Filings"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No SEC filings found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(filing) =>
            [filing.companyName, filing.formType, filing.filingDate, filing.description]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="date-desc"
          filterPlaceholder="Filter filings (company, form, date…)"
          getKey={(filing, i) => `${filing.companyName}-${filing.filingDate}-${i}`}
          renderItem={(filing) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">{filing.companyName}</p>
                <span className="text-xs bg-orange-900/40 text-orange-300 border border-orange-700/30 px-2 py-0.5 rounded shrink-0">
                  {filing.formType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Filed: {filing.filingDate}</p>
              {filing.description && (
                <p className="text-xs text-slate-600 mt-1">{filing.description}</p>
              )}
              {filing.url && (
                <a
                  href={filing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
                >
                  View on SEC.gov →
                </a>
              )}
            </div>
          )}
        />
      )}
    </Panel>
  )
})
