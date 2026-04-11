import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { MoleculeData } from '@/lib/types'

interface BgeePanelProps {
  data: MoleculeData
  panelId?: string
  lastFetched?: Date
}

export const BgeePanel = memo(function BgeePanel({ data, panelId, lastFetched }: BgeePanelProps) {
  const expressions = data.bgeeExpressions ?? []

  if (expressions.length === 0) {
    return (
      <Panel title="Bgee" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No gene expression data found for this molecule.</p>
      </Panel>
    )
  }

  // Group by tissue for better display
  const groupedByTissue = expressions.reduce((acc, expr) => {
    const tissue = expr.anatomicalEntityName || 'Unknown'
    if (!acc[tissue]) acc[tissue] = []
    acc[tissue].push(expr)
    return acc
  }, {} as Record<string, typeof expressions>)

  const tissues = Object.entries(groupedByTissue)

  return (
    <Panel title={`Bgee Gene Expression (${expressions.length} across ${tissues.length} tissues)`} panelId={panelId} lastFetched={lastFetched}>
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
    </Panel>
  )
})