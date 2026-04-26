import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { ISRCTNTrial } from '@/lib/types'

function TrialItem({ trial }: { trial: ISRCTNTrial }) {
  const statusColors: Record<string, string> = {
    'Completed': 'bg-green-900/40 text-green-300 border-green-700/30',
    'Recruiting': 'bg-blue-900/40 text-blue-300 border-blue-700/30',
    'Ongoing': 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
    'Suspended': 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
    'Terminated': 'bg-red-900/40 text-red-300 border-red-700/30',
    'Withdrawn': 'bg-red-800/40 text-red-200 border-red-600/30',
    'Not started': 'bg-slate-700/50 text-slate-300 border-slate-600/30',
    'Unknown': 'bg-slate-700/50 text-slate-300 border-slate-600/30',
  }

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/30 px-2 py-0.5 rounded shrink-0 font-mono">
          {trial.isRCTN}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${statusColors[trial.status] || statusColors.Unknown}`}>
          {trial.status}
        </span>
      </div>
      <h4 className="font-semibold text-slate-100 text-sm mt-2 line-clamp-2">{trial.title}</h4>
      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        {trial.phase && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{trial.phase}</span>
        )}
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{trial.recruitmentStatus}</span>
        {trial.targetEnrollment > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{trial.targetEnrollment} participants</span>
        )}
      </div>
      {trial.conditions.length > 0 && (
        <p className="text-xs text-slate-400 mt-1">
          <span className="text-slate-500">Conditions:</span> {trial.conditions.slice(0, 3).join(', ')}
          {trial.conditions.length > 3 && ` +${trial.conditions.length - 3} more`}
        </p>
      )}
      {trial.interventions.length > 0 && (
        <p className="text-xs text-slate-400 mt-0.5">
          <span className="text-slate-500">Interventions:</span> {trial.interventions.slice(0, 2).join(', ')}
          {trial.interventions.length > 2 && ` +${trial.interventions.length - 2} more`}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="text-xs text-slate-500">
          {trial.sponsor && <span>{trial.sponsor}</span>}
          {trial.country && <span className="ml-2">• {trial.country}</span>}
        </div>
        <a
          href={trial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          View Trial →
        </a>
      </div>
    </div>
  )
}

export const ISRCTNPanel = memo(function ISRCTNPanel({ trials, panelId, lastFetched }: { trials: ISRCTNTrial[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = trials.length === 0

  return (
    <Panel
      title="ISRCTN"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No ISRCTN clinical trials found for this molecule." : undefined}
    >
      {!isEmpty && (() => {
        const recruitingCount = trials.filter(t => t.status === 'Recruiting' || t.recruitmentStatus === 'Recruiting').length
        return (
          <>
            <p className="text-xs text-slate-400 mb-3">
              UK Clinical Trials Registry — {trials.length} trial{trials.length !== 1 ? 's' : ''}
              {recruitingCount > 0 && <span className="text-green-400 ml-2">{recruitingCount} recruiting</span>}
            </p>
            <PaginatedList className="space-y-2">
              {trials.map((trial, i) => (
                <TrialItem key={`${trial.isRCTN}-${i}`} trial={trial} />
              ))}
            </PaginatedList>
          </>
        )
      })()}
    </Panel>
  )
})