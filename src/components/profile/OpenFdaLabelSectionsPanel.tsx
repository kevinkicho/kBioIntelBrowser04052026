'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { OpenFdaLabelRecord } from '@/lib/api/openFdaLabelSections'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const OpenFdaLabelSectionsPanel = memo(function OpenFdaLabelSectionsPanel({
  labels,
  panelId,
  lastFetched,
}: {
  labels: OpenFdaLabelRecord[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(labels) ? labels : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<OpenFdaLabelRecord>((e) => e.brandName || ''),
      ...alphaSortOptions<OpenFdaLabelRecord>((e) => e.manufacturer || ''),
    ],
    [],
  )

  return (
    <Panel
      title="openFDA label sections"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isEmpty
          ? 'No openFDA structured label sections found (boxed warning, AEs, interactions…).'
          : undefined
      }
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(e) =>
            [
              e.brandName,
              e.genericName,
              e.manufacturer,
              ...e.sections.map((s) => `${s.label} ${s.text}`),
            ].join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="alpha-asc"
          filterPlaceholder="Filter labels / section text…"
          getKey={(e) => e.id}
          renderItem={(e) => (
            <div className="border-b border-slate-700 py-3 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{e.brandName}</p>
                  {e.genericName && (
                    <p className="text-[11px] text-slate-400">{e.genericName}</p>
                  )}
                  {e.manufacturer && (
                    <p className="text-[10px] text-slate-500">{e.manufacturer}</p>
                  )}
                </div>
                {e.dailyMedUrl && (
                  <a
                    href={e.dailyMedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[11px] text-indigo-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('openfda-labels', e.dailyMedUrl!, {
                        panelId: panelId || 'openfda-labels',
                        label: e.brandName,
                      })
                    }
                  >
                    DailyMed
                  </a>
                )}
              </div>
              <ul className="mt-2 space-y-2">
                {e.sections.map((s) => (
                  <li
                    key={s.key}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2"
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        s.key === 'boxed_warning' ? 'text-rose-300' : 'text-slate-500'
                      }`}
                    >
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300 line-clamp-4">
                      {s.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        />
      )}
      <p className="mt-2 text-[9px] text-slate-600">
        Free openFDA drug/label sections — label text only, not incidence or clinical advice.
      </p>
    </Panel>
  )
})
