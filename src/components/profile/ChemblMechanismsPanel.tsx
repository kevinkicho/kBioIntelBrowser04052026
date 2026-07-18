'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { ChemblMechanism } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import {
  chemblMechanismDeepLink,
  chemblTargetUrl,
  normalizeChemblId,
} from '@/lib/chemblLinks'

const actionTypeColors: Record<string, string> = {
  INHIBITOR: 'bg-red-900/40 text-red-300 border-red-700/30',
  AGONIST: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  ANTAGONIST: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
}

const defaultColors = 'bg-slate-700/40 text-slate-300 border-slate-600/30'

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
          className="space-y-3"
          renderItem={(mech) => {
            const colors = actionTypeColors[mech.actionType?.toUpperCase()] ?? defaultColors
            const targetId = normalizeChemblId(mech.targetChemblId)
            const href =
              mech.url && !mech.url.endsWith('//') && mech.url.includes('chembl')
                ? mech.url
                : chemblMechanismDeepLink({
                    targetChemblId: mech.targetChemblId,
                    moleculeChemblId: undefined,
                  })
            const targetHref = chemblTargetUrl(mech.targetChemblId)
            return (
              <div className="py-3 border-b border-slate-700 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
                    title="Open in ChEMBL"
                  >
                    {mech.mechanismOfAction || 'Mechanism'}
                    <span className="ml-1 text-[10px] text-cyan-500/80" aria-hidden>
                      ↗
                    </span>
                  </a>
                  {mech.actionType && (
                    <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${colors}`}>
                      {mech.actionType}
                    </span>
                  )}
                </div>
                {mech.targetName && (
                  <p className="text-xs text-slate-400 mt-1">Target: {mech.targetName}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  {mech.maxPhase > 0 && (
                    <span className="text-xs text-slate-400">Max Phase: {mech.maxPhase}</span>
                  )}
                  <span className="text-xs text-slate-500">
                    {mech.directInteraction ? 'Direct interaction' : 'Indirect interaction'}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                  {targetId && targetHref && (
                    <a
                      href={targetHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-indigo-400/90 hover:text-indigo-300 hover:underline"
                    >
                      Target {targetId} ↗
                    </a>
                  )}
                  {mech.moleculeName && (
                    <span className="text-slate-600">{mech.moleculeName}</span>
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
