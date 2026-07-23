'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { PurpleBookProduct } from '@/lib/api/purpleBookCache'
import {
  isPurpleBookBiosimilarLicense,
  isPurpleBookInterchangeableLicense,
} from '@/lib/api/purpleBookCache'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const PurpleBookPanel = memo(function PurpleBookPanel({
  products,
  sourceMonth,
  panelId,
  lastFetched,
}: {
  products: PurpleBookProduct[]
  sourceMonth?: string | null
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(products) ? products : []
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<PurpleBookProduct>((p) => p.proprietaryName || p.properName || ''),
      ...alphaSortOptions<PurpleBookProduct>((p) => p.applicant || '').map((o) => ({
        ...o,
        id: `app-${o.id}`,
        label: o.id.includes('asc') ? 'Applicant A–Z' : 'Applicant Z–A',
      })),
      ...alphaSortOptions<PurpleBookProduct>((p) => p.licenseType || ''),
    ],
    [],
  )

  return (
    <Panel
      title={
        list.length > 0
          ? `Purple Book (${list.length}${sourceMonth ? ` · ${sourceMonth}` : ''})`
          : 'Purple Book'
      }
      panelId={panelId}
      lastFetched={lastFetched}
      help="Official FDA Purple Book monthly data download (CSV). License type is from FDA files (351(a) / 351(k) biosimilar / interchangeable) — not clinical decision support."
      empty={
        list.length === 0
          ? 'No Purple Book monthly dump rows matched this name (tier B CSV cache). Try brand or proper name.'
          : undefined
      }
    >
      <div className="space-y-3">
        <a
          href="https://purplebooksearch.fda.gov/downloads"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[10px] text-indigo-400 hover:underline"
          onClick={() =>
            onDeepLinkClick('other', 'https://purplebooksearch.fda.gov/downloads', {
              panelId: panelId || 'purple-book',
              label: 'purple-book-downloads',
            })
          }
        >
          Purple Book downloads
        </a>
        {list.length > 0 && (
          <FilterablePaginatedList
            items={list}
            getSearchText={(p) =>
              [
                p.proprietaryName,
                p.properName,
                p.applicant,
                p.blaNumber,
                p.licenseType,
                p.refProductProperName,
                p.refProductProprietaryName,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter Purple Book rows…"
            getKey={(p, i) =>
              `${p.blaNumber}-${p.strength}-${p.productPresentation}-${i}`
            }
            renderItem={(p) => {
              const bio = isPurpleBookBiosimilarLicense(p.licenseType)
              const inter = isPurpleBookInterchangeableLicense(p.licenseType)
              return (
                <div
                  className="py-3 border-b border-slate-700/60 last:border-0"
                  data-testid="purple-book-row"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 text-sm">
                        {p.proprietaryName || p.properName || p.blaNumber}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {p.properName}
                        {p.strength ? ` · ${p.strength}` : ''}
                        {p.dosageForm ? ` · ${p.dosageForm}` : ''}
                        {p.route ? ` · ${p.route}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Applicant: {p.applicant || '—'}
                        {p.approvalDate ? ` · licensed ${p.approvalDate}` : ''}
                        {p.marketingStatus ? ` · ${p.marketingStatus}` : ''}
                      </p>
                      {(p.refProductProperName || p.refProductProprietaryName) && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Reference product:{' '}
                          {[p.refProductProprietaryName, p.refProductProperName]
                            .filter(Boolean)
                            .join(' / ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {p.blaNumber && (
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-600 px-2 py-0.5 rounded">
                          {p.blaNumber}
                        </span>
                      )}
                      <span
                        className={`text-[9px] rounded border px-1.5 py-0.5 ${
                          inter
                            ? 'border-amber-800/40 bg-amber-950/30 text-amber-300'
                            : bio
                              ? 'border-violet-800/40 bg-violet-950/30 text-violet-300'
                              : 'border-emerald-800/40 bg-emerald-950/30 text-emerald-300'
                        }`}
                      >
                        {p.licenseType || 'license type n/a'}
                      </span>
                      {/^yes$/i.test(p.patentListProvided || '') && (
                        <span className="text-[9px] rounded border border-sky-800/40 bg-sky-950/30 text-sky-300 px-1.5 py-0.5">
                          patent list (BPPT)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    <a
                      href={p.drugsAtFdaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:underline"
                      onClick={() =>
                        onDeepLinkClick('other', p.drugsAtFdaUrl, {
                          panelId: panelId || 'purple-book',
                          label: p.blaNumber,
                        })
                      }
                    >
                      Drugs@FDA
                    </a>
                    <a
                      href={p.purpleBookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:underline"
                      onClick={() =>
                        onDeepLinkClick('other', p.purpleBookUrl, {
                          panelId: panelId || 'purple-book',
                          label: 'purple-book-portal',
                        })
                      }
                    >
                      Purple Book portal
                    </a>
                    {p.applicant && (
                      <a
                        href={`https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${p.applicant}"`)}&forms=10-K,10-Q`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-400 hover:underline"
                        onClick={() =>
                          onDeepLinkClick(
                            'other',
                            `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(p.applicant)}`,
                            {
                              panelId: panelId || 'purple-book',
                              label: 'sec-applicant',
                            },
                          )
                        }
                      >
                        SEC search (applicant)
                      </a>
                    )}
                  </div>
                </div>
              )
            }}
          />
        )}
      </div>
    </Panel>
  )
})
