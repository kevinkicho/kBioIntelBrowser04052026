import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { SynthesisRoute } from '@/lib/types'

export const RheaPanel = memo(function RheaPanel({ routes, panelId, lastFetched }: { routes: SynthesisRoute[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = routes.length === 0
  return (
    <Panel
      title="Biochemical Reactions"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No biochemical reactions found." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {routes.map((route, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-200">{route.method}</span>
                <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded">
                  {route.source.toUpperCase()}
                </span>
              </div>
              {route.description && (
                <p className="text-xs text-slate-400 mt-1">{route.description}</p>
              )}
              {route.precursors && route.precursors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Precursors:</p>
                  <div className="flex flex-wrap gap-1">
                    {route.precursors.slice(0, 5).map((p, j) => (
                      <span key={j} className="text-xs bg-slate-700/40 text-slate-300 px-1.5 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                    {route.precursors.length > 5 && (
                      <span className="text-xs text-slate-500">+{route.precursors.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
              {route.enzymesInvolved && route.enzymesInvolved.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs text-slate-500">Enzymes: {route.enzymesInvolved.join(', ')}</p>
                </div>
              )}
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})