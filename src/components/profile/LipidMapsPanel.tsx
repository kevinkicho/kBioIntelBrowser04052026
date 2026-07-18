'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { LipidMapsLipid } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

function categoryBadge(category: string): string {
  const colors: Record<string, string> = {
    FA: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
    GL: 'bg-green-900/40 text-green-300 border-green-700/30',
    PK: 'bg-purple-900/40 text-purple-300 border-purple-700/30',
    SP: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
    ST: 'bg-red-900/40 text-red-300 border-red-700/30',
    PR: 'bg-pink-900/40 text-pink-300 border-pink-700/30',
  }
  const mainCat = category.split(':')[0]
  return colors[mainCat] || 'bg-slate-700/60 text-slate-300 border-slate-600/40'
}

export const LipidMapsPanel = memo(function LipidMapsPanel({
  lipids,
  panelId,
  lastFetched,
}: {
  lipids: LipidMapsLipid[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(lipids) ? lipids : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<LipidMapsLipid>((l) => l.name || ''),
      ...numberSortOptions<LipidMapsLipid>((l) => l.molecularWeight ?? 0, {
        high: 'Highest MW',
        low: 'Lowest MW',
      }),
    ],
    [],
  )

  return (
    <Panel
      title="LIPID MAPS"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No lipid entries found.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(l) =>
            [
              l.name,
              l.lmId,
              l.mainClass,
              l.subClass,
              l.formula,
              ...(l.synonyms || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter lipids…"
          getKey={(lipid, i) => `${lipid.lmId || lipid.name}-${i}`}
          renderItem={(lipid) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`text-xs border px-2 py-0.5 rounded shrink-0 ${categoryBadge(lipid.mainClass)}`}
                >
                  {lipid.mainClass}
                </span>
                <span className="text-xs font-mono bg-slate-700/50 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded">
                  {lipid.formula}
                </span>
              </div>
              <p className="font-semibold text-slate-100 text-sm mt-1">{lipid.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{lipid.lmId}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span>MW: {lipid.molecularWeight.toFixed(2)}</span>
                <span>Exact mass: {lipid.exactMass.toFixed(4)}</span>
              </div>
              {lipid.subClass && (
                <p className="text-xs text-slate-500 mt-1">Subclass: {lipid.subClass}</p>
              )}
              {lipid.synonyms.length > 0 && lipid.synonyms[0] && (
                <p className="text-xs text-slate-500 mt-1">
                  Synonyms: {lipid.synonyms.slice(0, 3).join(', ')}
                </p>
              )}
              <a
                href={lipid.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                View on LIPID MAPS →
              </a>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
