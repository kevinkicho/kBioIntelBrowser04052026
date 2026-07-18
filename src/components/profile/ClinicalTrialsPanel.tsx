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
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'text-emerald-300',
  RECRUITING: 'text-blue-300',
  ACTIVE_NOT_RECRUITING: 'text-yellow-300',
  TERMINATED: 'text-red-300',
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
      ...dateSortOptions<ClinicalTrial>((t) => t.startDate || t.completionDate, {
        newest: 'Newest start',
        oldest: 'Oldest start',
      }),
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
      <Panel
        title="Clinical Trials"
        panelId={panelId}
        lastFetched={lastFetched}
        empty="No clinical trials found for this molecule."
      />
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
          ]
            .filter(Boolean)
            .join(' ')
        }
        sortOptions={sortOptions}
        defaultSortId="date-desc"
        filterPlaceholder="Filter trials (title, NCT, status, condition…)"
        getKey={(t, i) => `${t.nctId}-${i}`}
        pageSize={8}
        className="space-y-0"
        renderItem={(trial, index) => {
          const conditionText = [trial.title, ...(trial.conditions || [])].join(' ')
          const diseaseMatch = diseaseName ? isMatch(conditionText, diseaseName) : false
          const href = trial.nctId
            ? `https://clinicaltrials.gov/study/${encodeURIComponent(trial.nctId)}`
            : null
          const phaseEmpty = isEmptyMetric(trial.phase) || trial.phase === 'N/A'
          const statusColor = STATUS_COLORS[trial.status] || 'text-slate-400'
          const content = (
            <div
              className={`grid grid-cols-[minmax(0,1.5fr)_5.5rem_4rem_minmax(0,0.8fr)_2.5rem] gap-x-2 items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group ${
                diseaseMatch ? 'bg-amber-950/20' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-100 group-hover:text-indigo-200 truncate">
                  {trial.title || '—'}
                  {diseaseMatch && (
                    <span className="ml-1.5 text-[10px] text-amber-300 font-normal">Match</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-600 truncate">
                  {[trial.nctId, trial.sponsor].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className={`text-[11px] truncate ${statusColor}`}>{trial.status || '—'}</span>
              <span className={`text-[11px] text-slate-400 truncate ${emptyDataClass(phaseEmpty)}`}>
                {phaseEmpty ? '—' : trial.phase}
              </span>
              <span
                className={`text-[11px] text-slate-500 truncate ${emptyDataClass(isEmptyMetric(trial.enrollment))}`}
              >
                {trial.enrollment != null && trial.enrollment > 0
                  ? `n=${trial.enrollment}`
                  : '—'}
              </span>
              <span className="text-xs text-indigo-400 group-hover:text-indigo-300 text-right">
                ↗
              </span>
            </div>
          )
          return (
            <div>
              {index === 0 && (
                <div
                  className="grid grid-cols-[minmax(0,1.5fr)_5.5rem_4rem_minmax(0,0.8fr)_2.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                  role="row"
                >
                  <span>Title</span>
                  <span>Status</span>
                  <span>Phase</span>
                  <span>Enroll</span>
                  <span className="text-right">Open</span>
                </div>
              )}
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open on ClinicalTrials.gov"
                  onClick={() =>
                    onDeepLinkClick('clinicaltrials', href, {
                      panelId: 'clinical-trials',
                      label: trial.nctId,
                    })
                  }
                >
                  {content}
                </a>
              ) : (
                content
              )}
            </div>
          )
        }}
      />
    </Panel>
  )
})
