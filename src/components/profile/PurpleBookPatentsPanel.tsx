'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { PurpleBookPatent } from '@/lib/api/purpleBookPatents'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const PurpleBookPatentsPanel = memo(function PurpleBookPatentsPanel({
  patents,
  panelId,
  lastFetched,
}: {
  patents: PurpleBookPatent[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(patents) ? patents : []
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<PurpleBookPatent>((p) => p.patentExpirationDate || ''),
      ...alphaSortOptions<PurpleBookPatent>((p) => p.patentNumber || ''),
      ...alphaSortOptions<PurpleBookPatent>((p) => p.proprietaryName || p.properName || ''),
    ],
    [],
  )

  return (
    <Panel
      title={list.length > 0 ? `Purple Book patents / BPPT (${list.length})` : 'Purple Book patents / BPPT'}
      panelId={panelId}
      lastFetched={lastFetched}
      help="Biological Product Patent Transparency (BPPT) list from FDA's Purple Book patent page. FDA publishes lists ministerially — not a determination of validity, enforceability, or infringement. Not legal or clinical advice."
      empty={
        list.length === 0
          ? 'No BPPT patent rows matched this name. Only some reference-product BLAs have sponsor-submitted patent lists published by FDA.'
          : undefined
      }
    >
      <div className="space-y-3">
        <a
          href="https://purplebooksearch.fda.gov/patent-list"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[10px] text-indigo-400 hover:underline"
          onClick={() =>
            onDeepLinkClick('other', 'https://purplebooksearch.fda.gov/patent-list', {
              panelId: panelId || 'purple-book-patents',
              label: 'bppt-portal',
            })
          }
        >
          Official patent list
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
                p.patentNumber,
                p.patentExpirationDate,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter patents / BLA / brand…"
            getKey={(p, i) => `${p.blaNumber}-${p.patentNumber}-${i}`}
            renderItem={(p) => (
              <div
                className="py-3 border-b border-slate-700/60 last:border-0"
                data-testid="purple-book-patent-row"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 text-sm">
                      US {p.patentNumber}
                      {p.patentExpirationDate ? (
                        <span className="font-normal text-slate-400 text-[11px] ml-2">
                          exp. {p.patentExpirationDate}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {p.proprietaryName || '—'}
                      {p.properName ? ` · ${p.properName}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {p.applicant || '—'}
                      {p.blaNumber ? ` · ${p.blaNumber}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-600 px-2 py-0.5 rounded">
                    {p.blaNumber}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <a
                    href={p.googlePatentsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('other', p.googlePatentsUrl, {
                        panelId: panelId || 'purple-book-patents',
                        label: p.patentNumber,
                      })
                    }
                  >
                    Google Patents
                  </a>
                  <a
                    href={p.purpleBookProductUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('other', p.purpleBookProductUrl, {
                        panelId: panelId || 'purple-book-patents',
                        label: p.blaNumber,
                      })
                    }
                  >
                    Purple Book product
                  </a>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </Panel>
  )
})
