import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { SynthesisRoute } from '@/lib/types'

export const SynthesisPanel = memo(function SynthesisPanel({ routes, panelId, lastFetched }: { routes: SynthesisRoute[], panelId?: string, lastFetched?: Date }) {
  if (routes.length === 0) {
    return (
      <Panel title="Synthesis & Manufacturing" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No synthesis routes found in KEGG or Rhea for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Synthesis & Manufacturing" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-4">
        {routes.map((route, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <p className="font-semibold text-slate-100 mb-1">{route.method}</p>
            {route.description && (
              <p className="text-sm text-slate-400 font-mono mb-2 break-words">{route.description}</p>
            )}
            {route.enzymesInvolved.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-xs text-slate-500 mr-1">Enzymes:</span>
                {route.enzymesInvolved.map(e => (
                  <span key={e} className="text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 px-2 py-0.5 rounded">{e}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-600 mt-2 uppercase tracking-wide">Source: {route.source}</p>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
