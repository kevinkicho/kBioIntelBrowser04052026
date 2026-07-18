'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { ChemblMechanism } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import {
  chemblMechanismDeepLink,
  chemblTargetUrl,
  isStableChemblDeepLink,
  normalizeChemblId,
} from '@/lib/chemblLinks'
import { preferStableDeepLink } from '@/lib/deepLinkPolicy'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'

const actionTypeColors: Record<string, string> = {
  INHIBITOR: 'text-red-300',
  AGONIST: 'text-emerald-300',
  ANTAGONIST: 'text-amber-300',
}

export const ChemblMechanismsPanel = memo(function ChemblMechanismsPanel({
  mechanisms,
  panelId,
  lastFetched,
}: {
  mechanisms: ChemblMechanism[]
  panelId?: string
  lastFetched?: Date
}) {
  const isEmpty = !Array.isArray(mechanisms) || mechanisms.length === 0
  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<ChemblMechanism>((m) => m.maxPhase ?? 0, {
        high: 'Highest phase',
        low: 'Lowest phase',
        idPrefix: 'phase',
      }),
      ...alphaSortOptions<ChemblMechanism>((m) => m.mechanismOfAction || m.targetName || ''),
    ],
    [],
  )

  return (
    <Panel
      title="Mechanisms of Action (ChEMBL)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No mechanism of action data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={mechanisms}
          getSearchText={(m) =>
            [
              m.mechanismOfAction,
              m.actionType,
              m.targetName,
              m.moleculeName,
              m.targetChemblId,
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="phase-desc"
          filterPlaceholder="Filter mechanisms…"
          getKey={(m, i) => `${m.mechanismId || m.mechanismOfAction}-${i}`}
          pageSize={8}
          className="space-y-0"
          renderItem={(mech, index) => {
            const targetId = normalizeChemblId(mech.targetChemblId)
            const href = preferStableDeepLink(
              isStableChemblDeepLink(mech.url) ? mech.url : null,
              chemblMechanismDeepLink({
                targetChemblId: mech.targetChemblId,
                moleculeChemblId: undefined,
              }),
            )
            const targetHref = chemblTargetUrl(mech.targetChemblId)
            const phaseEmpty = isEmptyMetric(mech.maxPhase)
            const typeColor =
              actionTypeColors[mech.actionType?.toUpperCase() || ''] || 'text-slate-300'
            return (
              <div>
                {index === 0 && (
                  <div
                    className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5rem_3.5rem_2.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                    role="row"
                  >
                    <span>Mechanism</span>
                    <span>Target</span>
                    <span>Action</span>
                    <span className="text-right">Phase</span>
                    <span className="text-right">Open</span>
                  </div>
                )}
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in ChEMBL"
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5rem_3.5rem_2.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                >
                  <span className="text-sm font-medium text-slate-100 group-hover:text-cyan-200 truncate">
                    {mech.mechanismOfAction || 'Mechanism'}
                  </span>
                  <span className="text-xs text-slate-400 truncate" title={mech.targetName}>
                    {targetId && targetHref ? (
                      <span className="font-mono text-indigo-400/90">{targetId}</span>
                    ) : (
                      mech.targetName || '—'
                    )}
                  </span>
                  <span className={`text-xs truncate ${typeColor}`}>
                    {mech.actionType || '—'}
                  </span>
                  <span
                    className={`text-xs text-right tabular-nums text-slate-400 ${emptyDataClass(phaseEmpty)}`}
                  >
                    {phaseEmpty ? '—' : mech.maxPhase}
                  </span>
                  <span className="text-xs text-cyan-400 group-hover:text-cyan-300 text-right">
                    ↗
                  </span>
                </a>
              </div>
            )
          }}
        />
      )}
    </Panel>
  )
})
