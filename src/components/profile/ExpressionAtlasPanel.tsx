import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GeneExpression } from '@/lib/types'

function typeBadgeClass(experimentType: string): string {
  if (experimentType.toLowerCase().includes('baseline')) {
    return 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/30'
  }
  if (experimentType.toLowerCase().includes('differential')) {
    return 'bg-violet-900/40 text-violet-300 border border-violet-700/30'
  }
  return 'bg-slate-700/60 text-slate-300 border border-slate-600/30'
}

export const ExpressionAtlasPanel = memo(function ExpressionAtlasPanel({ expressions, panelId, lastFetched }: { expressions: GeneExpression[], panelId?: string, lastFetched?: Date }) {
  if (expressions.length === 0) {
    return (
      <Panel title="Gene Expression (Expression Atlas)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No gene expression data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Gene Expression (Expression Atlas)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {expressions.map((expr, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${typeBadgeClass(expr.experimentType)}`}>
                  {expr.experimentType}
                </span>
                <p className="font-semibold text-slate-100 text-sm">{expr.experimentDescription}</p>
              </div>
              <a
                href={expr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
              >
                Expression Atlas →
              </a>
            </div>
            <div className="mt-2">
              <span className="text-xs text-slate-400">{expr.species}</span>
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
