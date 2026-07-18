'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { CompanyProduct } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

export const CompaniesPanel = memo(function CompaniesPanel({ companies, panelId, lastFetched }: { companies: CompanyProduct[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = companies.length === 0
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<CompanyProduct>((p) => p.brandName || p.genericName || ''),
      ...alphaSortOptions<CompanyProduct>((p) => p.company || '').map((o) => ({
        ...o,
        id: `company-${o.id}`,
        label: o.id.includes('asc') ? 'Company A–Z' : 'Company Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="Companies & Products"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No approved products found in openFDA for this molecule." : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={companies}
          getSearchText={(p) =>
            [p.brandName, p.company, p.genericName, p.route, p.applicationNumber, p.productType]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter products…"
          getKey={(p, i) => `${p.applicationNumber || p.brandName}-${i}`}
          className="space-y-3"
          renderItem={(product) => (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-slate-700 last:border-0">
              <div>
                <p className="font-semibold text-slate-100">{product.brandName}</p>
                <p className="text-sm text-slate-400">{product.company}</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{product.route}</span>
                <p className="text-xs text-slate-500 mt-1">{product.genericName}</p>
                {product.applicationNumber && (
                  <p className="text-xs text-slate-600 mt-0.5">{product.applicationNumber}</p>
                )}
              </div>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
