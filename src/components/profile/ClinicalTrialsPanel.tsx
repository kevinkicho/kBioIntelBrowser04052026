'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { PaginatedVirtualizedList } from '@/components/ui/VirtualizedList'
import { isMatch } from '@/hooks/useDiseaseContext'
import type { ClinicalTrial } from '@/lib/types'

const VIRTUALIZATION_THRESHOLD = 20

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  RECRUITING: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
  ACTIVE_NOT_RECRUITING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
  TERMINATED: 'bg-red-900/40 text-red-300 border-red-700/30',
}

function statusClass(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-slate-700 text-slate-300 border-slate-600'
}

function ClinicalTrialItem({ trial, diseaseMatch }: { trial: ClinicalTrial; diseaseMatch: boolean }) {
  return (
    <div className={`py-3 border-b border-slate-700 last:border-0 ${diseaseMatch ? 'bg-amber-950/20 -mx-4 px-4 rounded-md' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-100 text-sm">{trial.title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {diseaseMatch && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40 whitespace-nowrap">
              Match
            </span>
          )}
          <span className={`text-xs border px-2 py-0.5 rounded ${statusClass(trial.status)}`}>
            {trial.status}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-1">{trial.nctId} · {trial.sponsor}</p>
      <div className="flex gap-2 mt-1 flex-wrap">
        {trial.phase !== 'N/A' && (
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{trial.phase}</span>
        )}
        {trial.conditions.slice(0, 2).map((c, j) => (
          <span key={j} className={`text-xs px-2 py-0.5 rounded ${diseaseMatch ? 'bg-amber-700/30 text-amber-200' : 'bg-slate-700/50 text-slate-400'}`}>{c}</span>
        ))}
      </div>
      {trial.startDate && (
        <p className="text-xs text-slate-500 mt-1">Started: {trial.startDate}</p>
      )}
    </div>
  )
}

export const ClinicalTrialsPanel = memo(function ClinicalTrialsPanel({ trials, panelId, lastFetched, diseaseName }: { trials: ClinicalTrial[], panelId?: string, lastFetched?: Date, diseaseName?: string }) {
  const sortedTrials = useMemo(() => {
    if (!diseaseName) return trials
    const scored = trials.map(trial => {
      const conditionText = [trial.title, ...trial.conditions].join(' ')
      const matched = isMatch(conditionText, diseaseName)
      return { trial, matched }
    })
    const matching = scored.filter(s => s.matched).map(s => s.trial)
    const nonMatching = scored.filter(s => !s.matched).map(s => s.trial)
    return [...matching, ...nonMatching]
  }, [trials, diseaseName])

  if (trials.length === 0) {
    return (
      <Panel title="Clinical Trials" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No clinical trials found for this molecule.</p>
      </Panel>
    )
  }

  const matchCount = diseaseName ? sortedTrials.filter(t => {
    const conditionText = [t.title, ...t.conditions].join(' ')
    return isMatch(conditionText, diseaseName)
  }).length : 0

  const titleSuffix = diseaseName && matchCount > 0
    ? <span className="text-xs font-normal text-amber-300 ml-2">{matchCount} relevant to {diseaseName}</span>
    : null

  if (trials.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <Panel title="Clinical Trials" panelId={panelId} lastFetched={lastFetched} titleExtra={titleSuffix}>
        <PaginatedVirtualizedList
          items={sortedTrials}
          renderItem={(trial, i) => {
            const conditionText = [trial.title, ...trial.conditions].join(' ')
            const diseaseMatch = diseaseName ? isMatch(conditionText, diseaseName) : false
            return <ClinicalTrialItem key={`${trial.nctId}-${i}`} trial={trial} diseaseMatch={diseaseMatch} />
          }}
          initialCount={10}
          estimateSize={100}
          emptyMessage="No clinical trials found for this molecule."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Clinical Trials" panelId={panelId} lastFetched={lastFetched} titleExtra={titleSuffix}>
      <PaginatedList className="space-y-3">
        {sortedTrials.map((trial, i) => {
          const conditionText = [trial.title, ...trial.conditions].join(' ')
          const diseaseMatch = diseaseName ? isMatch(conditionText, diseaseName) : false
          return <ClinicalTrialItem key={`${trial.nctId}-${i}`} trial={trial} diseaseMatch={diseaseMatch} />
        })}
      </PaginatedList>
    </Panel>
  )
})