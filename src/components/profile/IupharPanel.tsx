'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { PharmacologyTarget } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'

function typeBadgeClass(type: string): string {
  const lower = type.toLowerCase()
  if (lower.includes('agonist') && !lower.includes('antagonist')) {
    return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30'
  }
  if (lower.includes('antagonist')) {
    return 'bg-rose-900/40 text-rose-300 border-rose-700/30'
  }
  if (lower.includes('inhibitor')) {
    return 'bg-amber-900/40 text-amber-300 border-amber-700/30'
  }
  return 'bg-slate-700/40 text-slate-300 border-slate-600/30'
}

export const IupharPanel = memo(function IupharPanel({
  targets,
  panelId,
  lastFetched,
}: {
  targets?: PharmacologyTarget[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(targets) ? targets.filter((t) => t?.targetName) : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<PharmacologyTarget>((t) => t.affinity ?? 0, {
        high: 'Highest affinity',
        low: 'Lowest affinity',
      }),
      ...alphaSortOptions<PharmacologyTarget>((t) => t.targetName || ''),
    ],
    [],
  )

  return (
    <Panel
      title={
        isEmpty
          ? 'Pharmacology Targets (IUPHAR)'
          : `Pharmacology Targets (IUPHAR) (${list.length})`
      }
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isEmpty
          ? 'No IUPHAR/BPS ligand–target interactions for this name (Guide to Pharmacology).'
          : undefined
      }
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(t) =>
            [
              t.targetName,
              t.targetId,
              t.type,
              t.actionType,
              t.species,
              t.ligandName,
              t.affinity,
              t.affinityUnit,
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="num-desc"
          filterPlaceholder="Filter targets…"
          getKey={(target, i) => `${target.targetId}-${i}`}
          renderItem={(target) => {
            const href =
              target.url ||
              (target.targetId
                ? `https://www.guidetopharmacology.org/GRAC/ObjectDisplayForward?objectId=${encodeURIComponent(target.targetId)}`
                : 'https://www.guidetopharmacology.org/')
            const affinityText =
              target.affinity != null && !Number.isNaN(Number(target.affinity))
                ? `${target.affinityUnit ? `${target.affinityUnit} ` : ''}${target.affinity}`
                : null
            return (
              <div className="py-3 border-b border-slate-700 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-100 text-sm hover:text-sky-400 transition-colors"
                  >
                    {target.targetName || 'Unnamed target'}
                  </a>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {target.primaryTarget && (
                      <span className="text-xs bg-sky-900/40 text-sky-300 border border-sky-700/30 px-2 py-0.5 rounded">
                        Primary Target
                      </span>
                    )}
                    {(target.type || target.actionType) && (
                      <span
                        className={`text-xs border px-2 py-0.5 rounded ${typeBadgeClass(
                          target.type || target.actionType || '',
                        )}`}
                      >
                        {target.type || target.actionType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {affinityText && (
                    <span className="text-sm text-slate-300 tabular-nums">{affinityText}</span>
                  )}
                  {target.species && (
                    <span className="text-xs text-slate-500">{target.species}</span>
                  )}
                  {target.ligandName && (
                    <span className="text-[10px] text-slate-600">Ligand: {target.ligandName}</span>
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
