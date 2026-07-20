'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { HealthCanadaDpdProduct } from '@/lib/api/healthCanadaDpd'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const HealthCanadaDpdPanel = memo(function HealthCanadaDpdPanel({
  products,
  panelId,
  lastFetched,
}: {
  products: HealthCanadaDpdProduct[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(products) ? products : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<HealthCanadaDpdProduct>((p) => p.brandName || ''),
      ...alphaSortOptions<HealthCanadaDpdProduct>((p) => p.status || '').map((o) => ({
        ...o,
        id: `status-${o.id}`,
        label: o.id.includes('asc') ? 'Status A–Z' : 'Status Z–A',
      })),
      ...alphaSortOptions<HealthCanadaDpdProduct>((p) => p.companyName || '').map((o) => ({
        ...o,
        id: `co-${o.id}`,
        label: o.id.includes('asc') ? 'Company A–Z' : 'Company Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="Health Canada DPD"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isEmpty
          ? 'No Health Canada Drug Product Database matches for this molecule name (free public API).'
          : undefined
      }
    >
      {!isEmpty && (
        <>
          <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
            Free public DPD API (no key). DIN / status are Canadian market authorizations — not US
            FDA approval and not clinical efficacy claims.
          </p>
          <FilterablePaginatedList
            items={list}
            getSearchText={(p) =>
              [
                p.brandName,
                p.din,
                p.companyName,
                p.status,
                p.className,
                ...p.forms,
                ...p.routes,
                ...p.ingredients.map((i) => i.name),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter (brand, DIN, status, ingredient…)"
            getKey={(p) => `${p.drugCode}-${p.din}`}
            renderItem={(p) => (
              <div className="py-3 border-b border-slate-700 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 text-sm">{p.brandName || '—'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {p.companyName || '—'}
                      {p.className ? ` · ${p.className}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {p.din && (
                      <span className="text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-600 px-2 py-0.5 rounded">
                        DIN {p.din}
                      </span>
                    )}
                    {p.status && (
                      <span className="text-[10px] bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 px-2 py-0.5 rounded">
                        {p.status}
                      </span>
                    )}
                  </div>
                </div>
                {(p.forms.length > 0 || p.routes.length > 0) && (
                  <p className="text-xs text-slate-400 mt-1">
                    {[p.forms.join(', '), p.routes.join(', ')].filter(Boolean).join(' · ')}
                  </p>
                )}
                {p.ingredients.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {p.ingredients.slice(0, 6).map((ing) => (
                      <li key={ing.name} className="text-[11px] text-slate-500">
                        {ing.name}
                        {ing.strength
                          ? ` — ${ing.strength}${ing.strengthUnit ? ` ${ing.strengthUnit}` : ''}`
                          : ''}
                      </li>
                    ))}
                    {p.ingredients.length > 6 && (
                      <li className="text-[10px] text-slate-600">
                        +{p.ingredients.length - 6} more ingredients
                      </li>
                    )}
                  </ul>
                )}
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-[10px] text-indigo-400 hover:text-indigo-300"
                    onClick={() =>
                      onDeepLinkClick('health_canada_dpd', p.url, {
                        panelId: panelId || 'health-canada',
                        label: p.din || p.brandName,
                      })
                    }
                  >
                    Open Health Canada DPD ↗
                  </a>
                )}
              </div>
            )}
          />
        </>
      )}
    </Panel>
  )
})
