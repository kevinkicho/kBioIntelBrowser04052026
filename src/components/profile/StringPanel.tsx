import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { StringInteraction } from '@/lib/types'

export const StringPanel = memo(function StringPanel({ interactions, panelId, lastFetched }: { interactions: StringInteraction[], panelId?: string, lastFetched?: Date }) {
  if (interactions.length === 0) {
    return (
      <Panel title="Protein Interactions (STRING)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No protein interactions found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Protein Interactions (STRING)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {interactions.map((interaction, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-100 text-sm">
                {interaction.proteinA} ↔ {interaction.proteinB}
              </p>
              <a
                href={interaction.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
              >
                STRING →
              </a>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Combined score</span>
                <span className="text-xs font-mono text-slate-200">{interaction.score.toFixed(3)}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full"
                  style={{ width: `${(interaction.score * 100).toFixed(1)}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2 flex-wrap">
              {interaction.experimentalScore && interaction.experimentalScore > 0 && (
                <span className="text-xs bg-teal-900/40 text-teal-300 border border-teal-700/30 px-2 py-0.5 rounded">
                  exp {interaction.experimentalScore.toFixed(3)}
                </span>
              )}
              {interaction.databaseScore && interaction.databaseScore > 0 && (
                <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded">
                  db {interaction.databaseScore.toFixed(3)}
                </span>
              )}
              {interaction.textminingScore && interaction.textminingScore > 0 && (
                <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded">
                  text {interaction.textminingScore.toFixed(3)}
                </span>
              )}
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
