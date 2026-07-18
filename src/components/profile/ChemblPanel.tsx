'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { ChemblActivity } from '@/lib/types'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import {
  chemblActivityDeepLink,
  chemblCompoundUrl,
  chemblTargetUrl,
  isStableChemblDeepLink,
  normalizeChemblId,
} from '@/lib/chemblLinks'
import { preferStableDeepLink } from '@/lib/deepLinkPolicy'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'

const ASSAY_TYPE_LABELS: Record<string, string> = {
  B: 'Binding',
  F: 'Functional',
  A: 'ADMET',
  T: 'Toxicity',
  P: 'Physicochemical',
}

function formatActivityValue(a: ChemblActivity): string {
  if (typeof a.pchemblValue === 'number' && a.pchemblValue > 0) {
    return `pChEMBL ${a.pchemblValue.toFixed(1)}`
  }
  if (typeof a.activityValue === 'number' && Number.isFinite(a.activityValue) && a.activityValue !== 0) {
    return `${a.activityValue} ${a.activityUnits || a.standardUnits || ''}`.trim()
  }
  return '—'
}

export const ChemblPanel = memo(function ChemblPanel({
  activities,
  panelId,
  lastFetched,
}: {
  activities: ChemblActivity[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(activities) ? activities : []
  const molId = list.map((a) => normalizeChemblId(a.chemblId)).find(Boolean) || null
  const compoundHref = chemblCompoundUrl(molId)
  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<ChemblActivity>((a) => a.pchemblValue ?? a.activityValue ?? 0, {
        high: 'Highest activity',
        low: 'Lowest activity',
        idPrefix: 'activity',
      }),
      ...alphaSortOptions<ChemblActivity>((a) => a.targetName || a.activityType),
    ],
    [],
  )

  if (list.length === 0) {
    return (
      <Panel
        title="Bioactivity (ChEMBL)"
        panelId={panelId}
        lastFetched={lastFetched}
        empty="No bioactivity data found for this molecule."
      />
    )
  }

  return (
    <Panel
      title={`Bioactivity (ChEMBL) (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      titleExtra={
        compoundHref ? (
          <a
            href={compoundHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-normal text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            Open compound in ChEMBL ↗
          </a>
        ) : null
      }
    >
      <FilterablePaginatedList
        items={list}
        getSearchText={(a) =>
          [
            a.targetName,
            a.activityType,
            a.assayType,
            a.chemblId,
            a.targetChemblId,
            String(a.activityValue),
            a.activityUnits,
          ]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="activity-desc"
        filterPlaceholder="Filter activities (target, type…)"
        getKey={(a, i) => `${a.targetChemblId || a.targetName}-${a.activityType}-${i}`}
        pageSize={8}
        className="space-y-0"
        renderItem={(activity, index) => {
          const targetId = normalizeChemblId(activity.targetChemblId)
          const targetHref = chemblTargetUrl(activity.targetChemblId)
          const rowHref = preferStableDeepLink(
            isStableChemblDeepLink(activity.url) ? activity.url : null,
            chemblActivityDeepLink({
              targetChemblId: activity.targetChemblId,
              moleculeChemblId: activity.chemblId,
              chemblId: activity.chemblId,
            }),
          )
          const potency = formatActivityValue(activity)
          const emptyPotency = potency === '—'
          return (
            <div>
              {index === 0 && (
                <div
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(4rem,0.7fr)_minmax(5rem,0.9fr)_4rem_2.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                  role="row"
                >
                  <span>Target</span>
                  <span>Type</span>
                  <span className="text-right">Potency</span>
                  <span>Assay</span>
                  <span className="text-right">Open</span>
                </div>
              )}
              <a
                href={rowHref}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${activity.targetName || 'activity'} in ChEMBL`}
                className="grid grid-cols-[minmax(0,1.4fr)_minmax(4rem,0.7fr)_minmax(5rem,0.9fr)_4rem_2.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-100 group-hover:text-cyan-200 truncate">
                    {activity.targetName || 'Unknown target'}
                  </div>
                  {targetId && (
                    <div className="text-[10px] font-mono text-slate-600 truncate">
                      {targetHref ? targetId : targetId}
                    </div>
                  )}
                </div>
                <span className="text-xs text-teal-300/90 truncate">
                  {activity.activityType || activity.standardType || '—'}
                </span>
                <span
                  className={`text-xs font-mono text-emerald-400/95 tabular-nums text-right truncate ${emptyDataClass(emptyPotency)}`}
                >
                  {potency}
                </span>
                <span
                  className={`text-[10px] text-slate-500 truncate ${emptyDataClass(isEmptyMetric(activity.assayType))}`}
                >
                  {ASSAY_TYPE_LABELS[activity.assayType] ?? activity.assayType ?? '—'}
                </span>
                <span className="text-xs text-cyan-400 group-hover:text-cyan-300 text-right">↗</span>
              </a>
            </div>
          )
        }}
      />
    </Panel>
  )
})
