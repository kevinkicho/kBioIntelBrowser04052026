'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { EmaBulkMedicine } from '@/lib/api/emaMedicinesBulk'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const EmaBulkMedicinesPanel = memo(function EmaBulkMedicinesPanel({
  products,
  panelId,
  lastFetched,
}: {
  products: EmaBulkMedicine[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(products) ? products : []
  const biosimilarCount = list.filter((p) => p.biosimilar).length
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<EmaBulkMedicine>((p) => p.name || ''),
      ...alphaSortOptions<EmaBulkMedicine>((p) => p.inn || '').map((o) => ({
        ...o,
        id: `inn-${o.id}`,
        label: o.id.includes('asc') ? 'INN A–Z' : 'INN Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={
        list.length > 0
          ? `EMA medicines dump (${list.length}${biosimilarCount ? ` · ${biosimilarCount} biosimilar` : ''})`
          : 'EMA medicines dump'
      }
      panelId={panelId}
      lastFetched={lastFetched}
      help="Official EMA medicines output Excel (cached server-side). Biosimilar flag is EMA's table column — not clinical decision support."
      empty={
        list.length === 0
          ? 'No rows matched this name in the official EMA medicines Excel dump (tier B, overnight updates).'
          : undefined
      }
    >
      <div className="space-y-3">
        <a
          href="https://www.ema.europa.eu/en/medicines/download-medicine-data"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[10px] text-indigo-400 hover:underline"
          onClick={() =>
            onDeepLinkClick(
              'other',
              'https://www.ema.europa.eu/en/medicines/download-medicine-data',
              { panelId: panelId || 'ema-bulk', label: 'ema-download-portal' },
            )
          }
        >
          EMA download page
        </a>
        {list.length > 0 && (
          <FilterablePaginatedList
            items={list}
            getSearchText={(p) =>
              [p.name, p.inn, p.activeSubstance, p.emaProductNumber, p.applicantHolder, p.atcCode]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter EMA dump rows…"
            getKey={(p, i) => `${p.emaProductNumber || p.name}-${i}`}
            renderItem={(p) => (
              <div
                className="py-3 border-b border-slate-700/60 last:border-0"
                data-testid="ema-bulk-row"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 text-sm">{p.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {[p.inn || p.activeSubstance, p.atcCode, p.medicineStatus]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {p.applicantHolder && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        MAH / applicant: {p.applicantHolder}
                        {p.marketingAuthorisationDate
                          ? ` · MA ${p.marketingAuthorisationDate}`
                          : ''}
                      </p>
                    )}
                    {p.therapeuticArea && (
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                        {p.therapeuticArea}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {p.emaProductNumber && (
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-600 px-2 py-0.5 rounded">
                        {p.emaProductNumber}
                      </span>
                    )}
                    {p.biosimilar && (
                      <span className="text-[9px] rounded border border-violet-800/40 bg-violet-950/30 text-violet-300 px-1.5 py-0.5">
                        biosimilar
                      </span>
                    )}
                    {p.orphanMedicine && (
                      <span className="text-[9px] rounded border border-sky-800/40 bg-sky-950/30 text-sky-300 px-1.5 py-0.5">
                        orphan
                      </span>
                    )}
                    {p.advancedTherapy && (
                      <span className="text-[9px] rounded border border-fuchsia-800/40 bg-fuchsia-950/30 text-fuchsia-300 px-1.5 py-0.5">
                        ATMP
                      </span>
                    )}
                    {p.generic && (
                      <span className="text-[9px] rounded border border-slate-700 text-slate-400 px-1.5 py-0.5">
                        generic
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={p.emaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-[10px] text-indigo-400 hover:underline"
                  onClick={() =>
                    onDeepLinkClick('other', p.emaUrl, {
                      panelId: panelId || 'ema-bulk',
                      label: p.emaProductNumber || p.name.slice(0, 40),
                    })
                  }
                >
                  EMA search
                </a>
              </div>
            )}
          />
        )}
      </div>
    </Panel>
  )
})
