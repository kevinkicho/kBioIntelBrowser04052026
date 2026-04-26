import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { PeptideAtlasEntry } from '@/lib/types'

interface PeptideAtlasPanelProps {
  peptides?: PeptideAtlasEntry[]
  panelId?: string
  lastFetched?: Date
}

export const PeptideAtlasPanel = memo(function PeptideAtlasPanel({ peptides, panelId, lastFetched }: PeptideAtlasPanelProps) {
  const isEmpty = !peptides || peptides.length === 0

  // Group peptides by protein (only when not empty)
  const groupedByProtein = !isEmpty ? peptides!.reduce((acc, peptide) => {
    const protein = peptide.proteinNames[0] || 'Unknown'
    if (!acc[protein]) acc[protein] = []
    acc[protein].push(peptide)
    return acc
  }, {} as Record<string, PeptideAtlasEntry[]>) : {}

  const proteins = Object.entries(groupedByProtein)
  const title = isEmpty ? "PeptideAtlas" : `PeptideAtlas Peptides (${peptides!.length} peptides, ${proteins.length} proteins)`

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No peptide data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {proteins.slice(0, 10).map(([protein, proteinPeptides]) => (
            <div key={protein} className="border-b border-slate-700/50 last:border-0 pb-2 last:pb-0">
              <h4 className="text-sm font-medium text-slate-200">{protein}</h4>
              <div className="space-y-0.5 pl-2 mt-1">
                {proteinPeptides.slice(0, 5).map((peptide, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex items-center gap-2">
                      <a
                        href={peptide.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono bg-slate-700/50 px-1.5 py-0.5 rounded text-blue-400 hover:text-blue-300"
                      >
                        {peptide.sequence.length > 25
                          ? `${peptide.sequence.substring(0, 25)}...`
                          : peptide.sequence}
                      </a>
                      <span className="text-slate-500">
                        ({peptide.length} aa)
                      </span>
                      {peptide.observations > 0 && (
                        <span className="px-1 py-0.5 bg-green-900/50 text-green-300 rounded">
                          {peptide.observations} obs
                        </span>
                      )}
                      {peptide.bestScore > 0 && (
                        <span className="px-1 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                          Score: {peptide.bestScore.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {peptide.geneSymbols && peptide.geneSymbols.length > 0 && (
                      <p className="text-slate-500 ml-1">
                        Genes: {peptide.geneSymbols.slice(0, 3).join(', ')}
                      </p>
                    )}
                    {(peptide.tissueSource || peptide.sampleSource) && (
                      <p className="text-slate-500 ml-1">
                        Source: {[peptide.tissueSource, peptide.sampleSource].filter(Boolean).join(' - ')}
                      </p>
                    )}
                  </div>
                ))}
                {proteinPeptides.length > 5 && (
                  <p className="text-xs text-slate-500">
                    +{proteinPeptides.length - 5} more peptides for this protein
                  </p>
                )}
              </div>
            </div>
          ))}
          {proteins.length > 10 && (
            <p className="text-xs text-slate-500 text-center py-1">
              Showing peptides from 10 of {proteins.length} proteins
            </p>
          )}
        </div>
      )}
    </Panel>
  )
})