'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { NdcProduct } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'
import {
  ndcProductDeepLink,
  ndcRowTitle,
  ndcSecondaryLabelLink,
} from '@/lib/ndcLinks'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const NdcPanel = memo(function NdcPanel({
  products,
  panelId,
  lastFetched,
}: {
  products: NdcProduct[]
  panelId?: string
  lastFetched?: Date
}) {
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
      ...alphaSortOptions<NdcProduct>((p) => p.productNdc || '').map((o) => ({
        ...o,
        id: `ndc-${o.id}`,
        label: o.id.includes('asc') ? 'NDC A–Z' : 'NDC Z–A',
      })),
      ...alphaSortOptions<NdcProduct>((p) => p.labelerName || '').map((o) => ({
        ...o,
        id: `labeler-${o.id}`,
        label: o.id.includes('asc') ? 'Labeler A–Z' : 'Labeler Z–A',
      })),
      ...alphaSortOptions<NdcProduct>((p) => p.marketingCategory || '').map((o) => ({
        ...o,
        id: `mkt-${o.id}`,
        label: o.id.includes('asc') ? 'Category A–Z' : 'Category Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={isEmpty ? 'FDA NDC Directory' : `FDA NDC Directory (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No FDA NDC data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <>
          <p className="mb-2 text-[10px] text-slate-600 leading-relaxed">
            National Drug Code products from openFDA. Click a row to open the exact NDC record;
            optional DailyMed label search is under each product when available.
          </p>
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
                product.productType,
                ...(product.pharmClass || []),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter products (brand, generic, NDC, labeler…)"
            getKey={(product, i) => `${product.productNdc || product.brandName || i}`}
            pageSize={8}
            className="space-y-0"
            renderItem={(product, index) => {
              const href = ndcProductDeepLink({
                productNdc: product.productNdc,
                brandName: product.brandName,
                genericName: product.genericName,
                url: product.url,
              })
              const labelHref = ndcSecondaryLabelLink({
                productNdc: product.productNdc,
                brandName: product.brandName,
                genericName: product.genericName,
              })
              const title = ndcRowTitle(product)
              const displayName = product.brandName || product.genericName || '—'
              const formRoute = [product.dosageForm, product.route].filter(Boolean).join(' · ')

              return (
                <div data-testid={`ndc-row-${product.productNdc || index}`}>
                  {index === 0 && (
                    <div
                      className="grid grid-cols-[minmax(0,1.2fr)_minmax(5.5rem,0.55fr)_minmax(5rem,0.7fr)_minmax(4rem,0.55fr)_minmax(0,0.85fr)] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                      role="row"
                    >
                      <span>Brand / generic</span>
                      <span>NDC</span>
                      <span>Form / route</span>
                      <span>Category</span>
                      <span>Labeler</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={title}
                    onClick={() =>
                      onDeepLinkClick('ndc', href, {
                        panelId: 'ndc',
                        label: product.productNdc || displayName,
                      })
                    }
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(5.5rem,0.55fr)_minmax(5rem,0.7fr)_minmax(4rem,0.55fr)_minmax(0,0.85fr)] gap-x-2 items-start px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-100 group-hover:text-cyan-200 truncate block">
                        {displayName}
                      </span>
                      {product.brandName && product.genericName && (
                        <span className="text-[10px] text-slate-500 truncate block">
                          {product.genericName}
                        </span>
                      )}
                      {product.productType && (
                        <span className="text-[9px] text-slate-600 truncate block mt-0.5">
                          {product.productType}
                        </span>
                      )}
                      {product.pharmClass?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.pharmClass.slice(0, 3).map((pc) => (
                            <StyledTooltip key={pc} content={pc}>
                              <span className="text-[9px] border px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border-violet-700/30 truncate max-w-full">
                                {pc}
                              </span>
                            </StyledTooltip>
                          ))}
                          {product.pharmClass.length > 3 && (
                            <span className="text-[9px] text-slate-600">
                              +{product.pharmClass.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <StyledTooltip content={product.productNdc || undefined}>
                      <span className="text-[11px] font-mono text-cyan-300/90 tabular-nums truncate">
                        {product.productNdc || '—'}
                      </span>
                    </StyledTooltip>
                    <StyledTooltip content={formRoute || undefined}>
                      <span className="text-[10px] text-slate-400 truncate">
                        {formRoute || '—'}
                      </span>
                    </StyledTooltip>
                    <StyledTooltip content={product.marketingCategory || undefined}>
                      <span className="text-[10px] text-slate-500 truncate">
                        {product.marketingCategory || '—'}
                      </span>
                    </StyledTooltip>
                    <StyledTooltip content={product.labelerName || undefined}>
                      <span className="text-[10px] text-slate-500 truncate">
                        {product.labelerName || '—'}
                      </span>
                    </StyledTooltip>
                  </a>
                  {labelHref && labelHref !== href && (
                    <div className="px-2 pb-2 -mt-0.5">
                      <a
                        href={labelHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-400/90 hover:text-indigo-300 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeepLinkClick('dailymed', labelHref, {
                            panelId: 'ndc',
                            label: `label:${product.productNdc}`,
                          })
                        }}
                      >
                        DailyMed labels for this NDC
                      </a>
                    </div>
                  )}
                </div>
              )
            }}
          />
        </>
      )}
    </Panel>
  )
})
