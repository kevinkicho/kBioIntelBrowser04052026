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
  normalizeChemblId,
} from '@/lib/chemblLinks'

const ASSAY_TYPE_LABELS: Record<string, string> = {
  B: 'Binding',
  F: 'Functional',
  A: 'ADMET',
  T: 'Toxicity',
  P: 'Physicochemical',
}

function ChemblActivityItem({ activity }: { activity: ChemblActivity }) {
  const targetId = normalizeChemblId(activity.targetChemblId)
  const molId = normalizeChemblId(activity.chemblId)
  const targetHref =
    chemblTargetUrl(activity.targetChemblId) ||
    chemblActivityDeepLink({
      targetChemblId: activity.targetChemblId,
      moleculeChemblId: activity.chemblId,
      chemblId: activity.chemblId,
    })
  const molHref = chemblCompoundUrl(activity.chemblId)
  const rowHref =
    activity.url?.includes('chembl') && !activity.url.endsWith('//')
      ? activity.url
      : targetHref

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={rowHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
          title="Open in ChEMBL"
        >
          {activity.targetName || 'Unknown target'}
          <span className="ml-1 text-[10px] text-cyan-500/80" aria-hidden>
            ↗
          </span>
        </a>
        <span className="text-xs bg-teal-900/40 text-teal-300 border border-teal-700/30 px-2 py-0.5 rounded shrink-0">
          {activity.activityType || activity.standardType}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
        <span className="text-sm text-slate-300">
          {activity.activityValue} {activity.activityUnits}
        </span>
        <span className="text-xs text-slate-500">
          {ASSAY_TYPE_LABELS[activity.assayType] ?? activity.assayType}
        </span>
        {typeof activity.pchemblValue === 'number' && activity.pchemblValue > 0 && (
          <span className="text-xs text-slate-500 tabular-nums">
            pChEMBL {activity.pchemblValue.toFixed(1)}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
        {targetId && (
          <a
            href={chemblTargetUrl(targetId) || rowHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-indigo-400/90 hover:text-indigo-300 hover:underline"
          >
            Target {targetId} ↗
          </a>
        )}
        {molId && molHref && (
          <a
            href={molHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-emerald-400/90 hover:text-emerald-300 hover:underline"
          >
            Molecule {molId} ↗
          </a>
        )}
      </div>
    </div>
  )
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
      ...numberSortOptions<ChemblActivity>((a) => a.activityValue ?? a.pchemblValue ?? 0, {
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
      <Panel title="Bioactivity (ChEMBL)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No bioactivity data found for this molecule.</p>
      </Panel>
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
        className="space-y-3"
        renderItem={(activity) => <ChemblActivityItem activity={activity} />}
      />
    </Panel>
  )
})
