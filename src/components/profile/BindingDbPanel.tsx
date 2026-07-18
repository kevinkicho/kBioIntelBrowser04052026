'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { BindingAffinity } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'

const AFFINITY_TYPE_COLORS: Record<string, string> = {
  Ki: 'text-violet-300',
  Kd: 'text-blue-300',
  IC50: 'text-orange-300',
  EC50: 'text-teal-300',
}

export const BindingDbPanel = memo(function BindingDbPanel({
  affinities,
  panelId,
  lastFetched,
}: {
  affinities: BindingAffinity[]
  panelId?: string
  lastFetched?: Date
}) {
  const isEmpty = affinities.length === 0
  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<BindingAffinity>((a) => a.affinityValue ?? 0, {
        high: 'Highest affinity value',
        low: 'Lowest affinity value',
        idPrefix: 'aff',
      }),
      ...alphaSortOptions<BindingAffinity>((a) => a.targetName || a.ligandName || ''),
    ],
    [],
  )

  return (
    <Panel
      title="Binding Affinities (BindingDB)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No binding affinity data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={affinities}
          getSearchText={(a) =>
            [a.targetName, a.ligandName, a.affinityType, a.source, a.doi, String(a.affinityValue)]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="aff-desc"
          filterPlaceholder="Filter affinities…"
          getKey={(a, i) => `${a.targetName}-${a.affinityType}-${i}`}
          pageSize={8}
          className="space-y-0"
          renderItem={(aff, index) => {
            const doiHref = aff.doi ? `https://doi.org/${aff.doi}` : null
            const emptyVal = isEmptyMetric(aff.affinityValue)
            return (
              <div>
                {index === 0 && (
                  <div
                    className="grid grid-cols-[minmax(0,1.3fr)_3.5rem_minmax(5rem,0.8fr)_minmax(0,0.9fr)_2.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                    role="row"
                  >
                    <span>Target</span>
                    <span>Type</span>
                    <span>Value</span>
                    <span>Source</span>
                    <span className="text-right">Open</span>
                  </div>
                )}
                <div className="grid grid-cols-[minmax(0,1.3fr)_3.5rem_minmax(5rem,0.8fr)_minmax(0,0.9fr)_2.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50 transition-colors">
                  <span className="text-sm font-medium text-slate-100 truncate" title={aff.targetName}>
                    {aff.targetName || '—'}
                  </span>
                  <span
                    className={`text-xs font-medium ${AFFINITY_TYPE_COLORS[aff.affinityType] ?? 'text-slate-300'}`}
                  >
                    {aff.affinityType || '—'}
                  </span>
                  <span
                    className={`text-xs font-mono tabular-nums text-slate-300 ${emptyDataClass(emptyVal)}`}
                  >
                    {emptyVal
                      ? '—'
                      : `${aff.affinityValue} ${aff.affinityUnits || aff.affinityUnit || ''}`.trim()}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate" title={aff.source}>
                    {aff.source || '—'}
                  </span>
                  {doiHref ? (
                    <a
                      href={doiHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:text-sky-300 text-right"
                      title="Open DOI"
                    >
                      ↗
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600 text-right">—</span>
                  )}
                </div>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
