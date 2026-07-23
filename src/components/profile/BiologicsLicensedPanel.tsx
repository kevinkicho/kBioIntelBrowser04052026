'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { BiologicLicensedProduct } from '@/lib/api/biologicsLicensed'
import { purpleBookDownloadUrl } from '@/lib/api/biologicsLicensed'
import { getEmaBulkDownloadLinks } from '@/lib/api/emaBulk'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { ExternalLinkTip } from '@/components/ui/HelperTip'

const ROLE_STYLE: Record<BiologicLicensedProduct['roleGuess'], string> = {
  reference_or_originator: 'border-emerald-800/40 bg-emerald-950/30 text-emerald-300',
  likely_biosimilar: 'border-violet-800/40 bg-violet-950/30 text-violet-300',
  unknown: 'border-slate-700 bg-slate-900/50 text-slate-400',
}

const ROLE_LABEL: Record<BiologicLicensedProduct['roleGuess'], string> = {
  reference_or_originator: 'originator / reference (heuristic)',
  likely_biosimilar: 'likely biosimilar (US suffix)',
  unknown: 'role unknown',
}

export const BiologicsLicensedPanel = memo(function BiologicsLicensedPanel({
  products,
  panelId,
  lastFetched,
}: {
  products: BiologicLicensedProduct[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(products) ? products : []
  const emaBiosimilar = useMemo(
    () => getEmaBulkDownloadLinks().find((l) => l.id === 'ema-biosimilars-topic'),
    [],
  )
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<BiologicLicensedProduct>((p) => p.brandName || ''),
      ...alphaSortOptions<BiologicLicensedProduct>((p) => p.sponsorName || '').map((o) => ({
        ...o,
        id: `sponsor-${o.id}`,
        label: o.id.includes('asc') ? 'Sponsor A–Z' : 'Sponsor Z–A',
      })),
      ...alphaSortOptions<BiologicLicensedProduct>((p) => p.applicationNumber || ''),
    ],
    [],
  )

  return (
    <Panel
      title={
        list.length > 0
          ? `Licensed biologics / biosimilars (${list.length})`
          : 'Licensed biologics / biosimilars'
      }
      panelId={panelId}
      lastFetched={lastFetched}
      help="Free openFDA Drugs@FDA BLA rows (licensed biologics / US biosimilar family). Role tags are heuristics from US 4-letter nonproprietary suffixes — not Purple Book interchangeability determinations. Not clinical decision support."
      empty={
        list.length === 0
          ? 'No FDA BLA records matched this name in openFDA Drugs@FDA. Small molecules usually appear under NDA/ANDA (Orange Book), not here.'
          : undefined
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
          <ExternalLinkTip
            href={purpleBookDownloadUrl()}
            label="Purple Book"
            title="Purple Book downloads (FDA portal)"
            onClick={() =>
              onDeepLinkClick('other', purpleBookDownloadUrl(), {
                panelId: panelId || 'biologics-licensed',
                label: 'purple-book-download',
              })
            }
          />
          {emaBiosimilar && (
            <ExternalLinkTip
              href={emaBiosimilar.url}
              label="EMA hub"
              title="EMA biosimilars hub"
              onClick={() =>
                onDeepLinkClick('other', emaBiosimilar.url, {
                  panelId: panelId || 'biologics-licensed',
                  label: 'ema-biosimilars',
                })
              }
            />
          )}
        </div>

        {list.length > 0 && (
          <FilterablePaginatedList
            items={list}
            getSearchText={(p) =>
              [
                p.brandName,
                p.nonproprietaryName,
                p.sponsorName,
                p.applicationNumber,
                p.dosageForm,
                p.marketingStatus,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter BLAs / sponsors…"
            getKey={(p, i) => `${p.applicationNumber}-${i}`}
            renderItem={(p) => (
              <div
                className="py-3 border-b border-slate-700/60 last:border-0"
                data-testid="biologic-licensed-row"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 text-sm">
                      {p.brandName || p.nonproprietaryName || p.applicationNumber}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {p.nonproprietaryName}
                      {p.strength ? ` · ${p.strength}` : ''}
                      {p.dosageForm ? ` · ${p.dosageForm}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sponsor: {p.sponsorName || '—'}
                      {p.approvalDate ? ` · first submission date ${p.approvalDate}` : ''}
                      {p.marketingStatus ? ` · ${p.marketingStatus}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-600 px-2 py-0.5 rounded">
                      {p.applicationNumber}
                    </span>
                    <span
                      className={`text-[9px] rounded border px-1.5 py-0.5 ${ROLE_STYLE[p.roleGuess]}`}
                    >
                      {ROLE_LABEL[p.roleGuess]}
                    </span>
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
                        panelId: panelId || 'biologics-licensed',
                        label: p.applicationNumber,
                      })
                    }
                  >
                    Drugs@FDA
                  </a>
                  <a
                    href={p.purpleBookSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('other', p.purpleBookSearchUrl, {
                        panelId: panelId || 'biologics-licensed',
                        label: 'purple-book',
                      })
                    }
                  >
                    Purple Book
                  </a>
                  <a
                    href={p.establishmentSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('other', p.establishmentSearchUrl, {
                        panelId: panelId || 'biologics-licensed',
                        label: 'fda-establishment',
                      })
                    }
                  >
                    FDA establishment search
                  </a>
                  {p.sponsorName && (
                    <a
                      href={`https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${p.sponsorName}"`)}&forms=10-K,10-Q`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:underline"
                      onClick={() =>
                        onDeepLinkClick(
                          'other',
                          `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(p.sponsorName)}`,
                          {
                            panelId: panelId || 'biologics-licensed',
                            label: 'sec-sponsor',
                          },
                        )
                      }
                    >
                      SEC 10-K/10-Q search
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
