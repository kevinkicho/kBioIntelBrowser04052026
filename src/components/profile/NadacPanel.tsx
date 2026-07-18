'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { PricingChart } from '@/components/charts/PricingChart'
import type { DrugPrice } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

function pharmacyBadgeClass(type: string): string {
  if (type === 'MAIL ORDER' || type === 'M') {
    return 'bg-violet-900/40 text-violet-300 border border-violet-700/30'
  }
  return 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/30'
}

function pharmacyLabel(type: string): string {
  if (type === 'R') return 'RETAIL'
  if (type === 'M') return 'MAIL ORDER'
  return type || 'RETAIL'
}

export const NadacPanel = memo(function NadacPanel({ prices, panelId, lastFetched }: { prices: DrugPrice[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(prices) ? prices : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<DrugPrice>((p) => p.effectiveDate, {
        newest: 'Newest effective',
        oldest: 'Oldest effective',
      }),
      ...numberSortOptions<DrugPrice>((p) => p.nadacPerUnit || 0, {
        high: 'Highest price',
        low: 'Lowest price',
      }),
      ...alphaSortOptions<DrugPrice>((p) => p.ndcDescription || ''),
    ],
    [],
  )

  return (
    <Panel
      title="CMS NADAC Drug Pricing"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No recent NADAC pricing data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <>
          <PricingChart prices={list} />
          <div className="mt-4">
            <FilterablePaginatedList
              items={list}
              getSearchText={(price) =>
                [price.ndcDescription, price.pharmacyType, price.effectiveDate, price.pricingUnit]
                  .filter(Boolean)
                  .join(' ')
              }
              sortOptions={sortOptions}
              defaultSortId="date-desc"
              filterPlaceholder="Filter prices (description, pharmacy…)"
              getKey={(price, i) => `${price.ndcDescription}-${price.effectiveDate}-${i}`}
              renderItem={(price) => (
                <div className="py-3 border-b border-slate-700 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-100 text-sm">{price.ndcDescription}</p>
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${pharmacyBadgeClass(price.pharmacyType)}`}>
                      {pharmacyLabel(price.pharmacyType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-mono text-emerald-400">
                      ${price.nadacPerUnit.toFixed(4)} / {price.pricingUnit || 'unit'}
                    </span>
                  </div>
                  {price.effectiveDate && (
                    <p className="text-xs text-slate-500 mt-1">Effective: {price.effectiveDate.slice(0, 10)}</p>
                  )}
                  <a
                    href={price.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline mt-1 inline-block"
                  >
                    NADAC dataset →
                  </a>
                </div>
              )}
            />
          </div>
        </>
      )}
    </Panel>
  )
})
