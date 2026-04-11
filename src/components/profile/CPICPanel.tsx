import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { CPICGuideline } from '@/lib/types'

function GuidelineItem({ guideline }: { guideline: CPICGuideline }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-100 text-sm">{guideline.drugName}</h4>
          {guideline.drugClass && (
            <p className="text-xs text-slate-400 mt-0.5">{guideline.drugClass}</p>
          )}
        </div>
        <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
          {guideline.gene}
        </span>
      </div>
      {(guideline.recommendations?.length ?? 0) > 0 && (
        <div className="mt-2 space-y-1.5">
          {(guideline.recommendations ?? []).slice(0, 3).map((rec, i) => (
            <div key={i} className="text-xs bg-slate-800/50 rounded p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-purple-300 font-medium">{rec.phenotype}</span>
                <span className="text-slate-400">{rec.activityScore}</span>
              </div>
              <p className="text-slate-300">{rec.therapeuticRecommendation}</p>
              {rec.implication && (
                <p className="text-slate-500 mt-1">Implication: {rec.implication}</p>
              )}
            </div>
          ))}
          {(guideline.recommendations?.length ?? 0) > 3 && (
            <p className="text-xs text-slate-400">+{(guideline.recommendations?.length ?? 0) - 3} more recommendations</p>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-500">Updated: {guideline.lastUpdated || 'N/A'}</span>
        <a
          href={guideline.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          View Guideline →
        </a>
      </div>
    </div>
  )
}

export const CPICPanel = memo(function CPICPanel({ guidelines, panelId, lastFetched }: { guidelines: CPICGuideline[], panelId?: string, lastFetched?: Date }) {
  if (guidelines.length === 0) {
    return (
      <Panel title="CPIC Guidelines" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No clinical pharmacogenetic guidelines found for this molecule.</p>
      </Panel>
    )
  }

  const uniqueGenes = new Set(guidelines.map(g => g.gene))
  const uniqueDrugs = new Set(guidelines.map(g => g.drugName))

  return (
    <Panel title="CPIC Guidelines" panelId={panelId} lastFetched={lastFetched}>
      <p className="text-xs text-slate-400 mb-3">
        Clinical Pharmacogenetics Implementation Consortium — {uniqueDrugs.size} drug{uniqueDrugs.size !== 1 ? 's' : ''}, {uniqueGenes.size} gene{uniqueGenes.size !== 1 ? 's' : ''}
      </p>
      <PaginatedList className="space-y-2">
        {guidelines.map((guideline, i) => (
          <GuidelineItem key={`${guideline.id}-${i}`} guideline={guideline} />
        ))}
      </PaginatedList>
    </Panel>
  )
})