import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MolecularInteraction } from '@/lib/types'

export const IntActPanel = memo(function IntActPanel({ interactions, panelId, lastFetched }: { interactions: MolecularInteraction[], panelId?: string, lastFetched?: Date }) {
  if (interactions.length === 0) {
    return (
      <Panel title="Molecular Interactions (IntAct)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No molecular interaction data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Molecular Interactions (IntAct)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {interactions.map((interaction, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-100 text-sm">
                {interaction.interactorA} ↔ {interaction.interactorB}
              </p>
              <a
                href={interaction.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
              >
                IntAct →
              </a>
            </div>

            <div className="flex gap-2 mt-2 flex-wrap">
              {interaction.interactionType && (
                <span className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded">
                  {interaction.interactionType}
                </span>
              )}
              {interaction.detectionMethod && (
                <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded">
                  {interaction.detectionMethod}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {interaction.pubmedId && (
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${interaction.pubmedId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    PubMed {interaction.pubmedId}
                  </a>
                )}
              </div>
              {interaction.confidenceScore !== undefined && interaction.confidenceScore > 0 && (
                <span className="text-xs text-slate-400">
                  score {interaction.confidenceScore.toFixed(3)}
                </span>
              )}
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
