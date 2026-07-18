'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { isMatch } from '@/hooks/useDiseaseContext'
import type { ClinicalTrial } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  RECRUITING: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
  ACTIVE_NOT_RECRUITING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
  TERMINATED: 'bg-red-900/40 text-red-300 border-red-700/30',
}

function statusClass(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-slate-700 text-slate-300 border-slate-600'
}

function ClinicalTrialItem({
  trial,
  diseaseMatch,
}: {
  trial: ClinicalTrial
  diseaseMatch: boolean
}) {
  const ctGov = trial.nctId
    ? `https://clinicaltrials.gov/study/${encodeURIComponent(trial.nctId)}`
    : undefined
  return (
    <div
      className={`py-2 border-b border-slate-700/60 last:border-0 ${
        diseaseMatch ? 'bg-amber-950/20 -mx-2 px-2 rounded-md' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {ctGov ? (
            <a
              href={ctGov}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-100 text-sm hover:text-indigo-300"
            >
              {trial.title}
            </a>
          ) : (
            <p className="font-semibold text-slate-100 text-sm">{trial.title}</p>
          )}
          <p className="text-[11px] text-slate-500 mt-0.5">
            {[trial.nctId, trial.sponsor].filter(Boolean).join(' · ')}
          </p>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {trial.phase && trial.phase !== 'N/A' && (
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                {trial.phase}
              </span>
            )}
            {trial.conditions?.slice(0, 3).map((c, j) => (
              <span
                key={j}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  diseaseMatch
                    ? 'bg-amber-700/30 text-amber-200'
                    : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                {c}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {[
              trial.startDate && `Start ${trial.startDate}`,
              trial.completionDate && `End ${trial.completionDate}`,
              trial.enrollment != null && `n=${trial.enrollment}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {diseaseMatch && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40">
              Match
            </span>
          )}
          <span className={`text-[10px] border px-1.5 py-0.5 rounded ${statusClass(trial.status)}`}>
            {trial.status}
          </span>
          {ctGov && (
            <a
              href={ctGov}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400 hover:text-indigo-300"
            >
              CT.gov ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export const ClinicalTrialsPanel = memo(function ClinicalTrialsPanel({
  trials,
  panelId,
  lastFetched,
  diseaseName,
}: {
  trials: ClinicalTrial[]
  panelId?: string
  lastFetched?: Date
  diseaseName?: string
}) {
  const list = Array.isArray(trials) ? trials : []

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<ClinicalTrial>(
        (t) => t.startDate || t.completionDate,
        { newest: 'Newest start', oldest: 'Oldest start' },
      ),
      ...dateSortOptions<ClinicalTrial>((t) => t.completionDate, {
        newest: 'Newest completion',
        oldest: 'Oldest completion',
      }).map((o) => ({ ...o, id: `end-${o.id}` })),
      ...alphaSortOptions<ClinicalTrial>((t) => t.title || t.nctId),
      ...numberSortOptions<ClinicalTrial>((t) => t.enrollment ?? 0, {
        high: 'Largest enrollment',
        low: 'Smallest enrollment',
      }),
      {
        id: 'status',
        label: 'Status A–Z',
        compare: (a: ClinicalTrial, b: ClinicalTrial) =>
          (a.status || '').localeCompare(b.status || ''),
      },
    ],
    [],
  )

  const matchCount = diseaseName
    ? list.filter((t) => isMatch([t.title, ...(t.conditions || [])].join(' '), diseaseName))
        .length
    : 0

  const titleSuffix =
    diseaseName && matchCount > 0 ? (
      <span className="text-xs font-normal text-amber-300 ml-2">
        {matchCount} relevant to {diseaseName}
      </span>
    ) : null

  if (list.length === 0) {
    return (
      <Panel title="Clinical Trials" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No clinical trials found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel
      title={`Clinical Trials (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      titleExtra={titleSuffix}
    >
      <FilterablePaginatedList
        items={list}
        getSearchText={(t) =>
          [
            t.title,
            t.nctId,
            t.status,
            t.phase,
            t.sponsor,
            ...(t.conditions || []),
            ...(t.interventions || []),
            t.startDate,
            t.completionDate,
          ]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="date-desc"
        filterPlaceholder="Filter trials (title, NCT, status, condition…)"
        getKey={(t, i) => `${t.nctId}-${i}`}
        pageSize={5}
        renderItem={(trial) => {
          const conditionText = [trial.title, ...(trial.conditions || [])].join(' ')
          const diseaseMatch = diseaseName ? isMatch(conditionText, diseaseName) : false
          return <ClinicalTrialItem trial={trial} diseaseMatch={diseaseMatch} />
        }}
      />
    </Panel>
  )
})
