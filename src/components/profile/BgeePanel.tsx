import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { BgeeExpression } from '@/lib/types'

interface BgeePanelProps {
  expressions?: BgeeExpression[]
  panelId?: string
  lastFetched?: Date
}

export const BgeePanel = memo(function BgeePanel({ expressions, panelId, lastFetched }: BgeePanelProps) {
  const isEmpty = !expressions || expressions.length === 0

  // Group by tissue for better display (only when not empty)
  const groupedByTissue = !isEmpty ? expressions!.reduce((acc, expr) => {
    const tissue = expr.anatomicalEntityName || 'Unknown'
    if (!acc[tissue]) acc[tissue] = []
    acc[tissue].push(expr)
    return acc
  }, {} as Record<string, BgeeExpression[]>) : {}

  const tissues = Object.entries(groupedByTissue)
  const title = isEmpty ? "Bgee" : `Bgee Gene Expression (${expressions!.length} across ${tissues.length} tissues)`

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No gene expression data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tissues.slice(0, 15).map(([tissue, exprs]) => (
            <div key={tissue} className="border-b border-slate-700/50 last:border-0 pb-2 last:pb-0">
              <h4 className="text-sm font-medium text-slate-200">{tissue}</h4>
              <div className="mt-1 space-y-0.5">
                {exprs.slice(0, 3).map((expr, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {expr.developmentalStageName && (
                      <span className="text-slate-400">{expr.developmentalStageName}</span>
                    )}
                    {expr.expressionScore > 0 && (
                      <span className="px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded">
                        Score: {expr.expressionScore.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
                {exprs.length > 3 && (
                  <p className="text-xs text-slate-500">+{exprs.length - 3} more stages</p>
                )}
              </div>
            </div>
          ))}
          {tissues.length > 15 && (
            <p className="text-xs text-slate-500 text-center">
              +{tissues.length - 15} more tissues
            </p>
          )}
        </div>
      )}
    </Panel>
  )
})