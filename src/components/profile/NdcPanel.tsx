'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { NdcProduct } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

export const NdcPanel = memo(function NdcPanel({ products, panelId, lastFetched }: { products: NdcProduct[], panelId?: string, lastFetched?: Date }) {
  const list = Array.isArray(products) ? products : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<NdcProduct>((p) => p.brandName || p.genericName || ''),
      ...alphaSortOptions<NdcProduct>((p) => p.genericName || '').map((o) => ({
        ...o,
        id: `generic-${o.id}`,
        label: o.id.includes('asc') ? 'Generic A–Z' : 'Generic Z–A',
      })),
      ...alphaSortOptions<NdcProduct>((p) => p.labelerName || '').map((o) => ({
        ...o,
        id: `labeler-${o.id}`,
        label: o.id.includes('asc') ? 'Labeler A–Z' : 'Labeler Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="FDA NDC Directory"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No FDA NDC data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(product) =>
            [
              product.brandName,
              product.genericName,
              product.productNdc,
              product.dosageForm,
              product.route,
              product.marketingCategory,
              product.labelerName,
              ...(product.pharmClass || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter products (brand, generic, NDC, labeler…)"
          getKey={(product, i) => `${product.productNdc || i}`}
          renderItem={(product) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
                  >
                    {product.brandName || product.genericName}
                  </a>
                  {product.brandName && product.genericName && (
                    <p className="text-xs text-slate-400 mt-0.5">{product.genericName}</p>
                  )}
                </div>
                <span className="text-xs border px-2 py-0.5 rounded shrink-0 bg-cyan-900/40 text-cyan-300 border-cyan-700/30">
                  {product.productNdc}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {product.dosageForm && (
                  <span className="text-xs text-slate-400">{product.dosageForm}</span>
                )}
                {product.route && (
                  <span className="text-xs text-slate-500">{product.route}</span>
                )}
                {product.marketingCategory && (
                  <span className="text-xs text-slate-500">{product.marketingCategory}</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{product.labelerName}</p>
              {product.pharmClass.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.pharmClass.map((pc, j) => (
                    <span
                      key={j}
                      className="text-xs border px-2 py-0.5 rounded bg-violet-900/40 text-violet-300 border-violet-700/30"
                    >
                      {pc}
                    </span>
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
