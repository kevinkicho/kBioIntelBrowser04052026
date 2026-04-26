import { memo } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DrugGeneInteraction } from '@/lib/types'

export const DgidbPanel = memo(function DgidbPanel({ interactions, panelId, lastFetched }: { interactions: DrugGeneInteraction[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = interactions.length === 0
  return (
    <Panel
      title="Drug-Gene Interactions (DGIdb)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No drug-gene interactions found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {interactions.map((interaction, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/gene?q=${encodeURIComponent(interaction.geneSymbol || interaction.geneName)}`}
                  className="text-xs font-semibold bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0 hover:bg-cyan-800/60 transition-colors"
                >
                  {interaction.geneName}
                </Link>
                {interaction.interactionType && (
                  <span className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded shrink-0">
                    {interaction.interactionType}
                  </span>
                )}
              </div>
              {interaction.source && (
                <p className="text-xs text-slate-400 mt-1">Sources: {interaction.source}</p>
              )}
              {interaction.score > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">Score: {interaction.score.toFixed(1)}</p>
              )}
              <a href={interaction.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
                View in DGIdb →
              </a>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
