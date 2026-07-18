import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GeneExpression } from '@/lib/types'

function typeBadgeClass(experimentType: string): string {
  const t = (experimentType || '').toLowerCase()
  if (t.includes('baseline')) return 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30'
  if (t.includes('differential')) return 'bg-violet-900/40 text-violet-300 border-violet-700/30'
  return 'bg-slate-700/60 text-slate-300 border-slate-600/30'
}

export const ExpressionAtlasPanel = memo(function ExpressionAtlasPanel({
  expressions,
  panelId,
  lastFetched,
}: {
  expressions: GeneExpression[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(expressions) ? expressions : []
  const isEmpty = list.length === 0
  return (
    <Panel
      title={
        isEmpty
          ? 'Gene Expression (Expression Atlas)'
          : `Gene Expression (Expression Atlas) (${list.length})`
      }
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No gene expression data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-1">
          {list.map((expr, i) => (
            <div key={i} className="py-2 border-b border-slate-700/60 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {expr.experimentType && (
                      <span
                        className={`text-[10px] border px-1.5 py-0.5 rounded shrink-0 ${typeBadgeClass(expr.experimentType)}`}
                      >
                        {expr.experimentType}
                      </span>
                    )}
                    {expr.geneSymbol && (
                      <span className="text-[10px] font-mono text-indigo-300/90 bg-indigo-900/20 border border-indigo-800/40 px-1.5 py-0.5 rounded">
                        {expr.geneSymbol}
                      </span>
                    )}
                    {expr.species && (
                      <span className="text-[10px] text-slate-500 italic">{expr.species}</span>
                    )}
                  </div>
                  <a
                    href={expr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block text-sm text-slate-100 hover:text-cyan-300 leading-snug line-clamp-2"
                  >
                    {expr.experimentDescription || expr.condition || 'Expression experiment'}
                  </a>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {[
                      expr.tissueName && `Tissue: ${expr.tissueName}`,
                      expr.condition && expr.condition !== expr.experimentDescription
                        ? expr.condition
                        : null,
                      expr.expressionLevel
                        ? `${expr.expressionLevel}${expr.unit ? ` ${expr.unit}` : ''}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {expr.url && (
                  <a
                    href={expr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] text-cyan-400 hover:text-cyan-300"
                  >
                    Atlas ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
