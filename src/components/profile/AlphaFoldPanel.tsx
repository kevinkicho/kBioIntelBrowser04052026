import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { AlphaFoldPrediction } from '@/lib/types'

function confidenceColor(score: number): string {
  if (score >= 90) return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30'
  if (score >= 70) return 'bg-amber-900/40 text-amber-300 border-amber-700/30'
  return 'bg-red-900/40 text-red-300 border-red-700/30'
}

export const AlphaFoldPanel = memo(function AlphaFoldPanel({ predictions, panelId, lastFetched }: { predictions: AlphaFoldPrediction[], panelId?: string, lastFetched?: Date }) {
  if (predictions.length === 0) {
    return (
      <Panel title="AlphaFold Predicted Structures" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No AlphaFold predictions found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="AlphaFold Predicted Structures" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {predictions.map((pred, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-mono bg-slate-700/60 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded shrink-0">
                {pred.uniprotAccession}
              </span>
              {pred.confidenceScore > 0 && (
                <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${confidenceColor(pred.confidenceScore)}`}>
                  pLDDT {pred.confidenceScore.toFixed(1)}
                </span>
              )}
            </div>
            {pred.geneName && (
              <p className="text-sm font-medium text-slate-200 mt-1">{pred.geneName}</p>
            )}
            {pred.organismName && (
              <p className="text-xs text-slate-400 mt-0.5 italic">{pred.organismName}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <a
                href={pred.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View in AlphaFold DB →
              </a>
              {pred.modelUrl && (
                <a
                  href={pred.modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-slate-300"
                >
                  Download CIF
                </a>
              )}
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
