import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GoAnnotation } from '@/lib/types'

function aspectColor(aspect: string): string {
  if (aspect === 'molecular_function') return 'bg-blue-900/40 text-blue-300 border-blue-700/30'
  if (aspect === 'biological_process') return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30'
  if (aspect === 'cellular_component') return 'bg-amber-900/40 text-amber-300 border-amber-700/30'
  return 'bg-slate-700/60 text-slate-300 border-slate-600/40'
}

export const QuickGoPanel = memo(function QuickGoPanel({ annotations, panelId, lastFetched }: { annotations: GoAnnotation[], panelId?: string, lastFetched?: Date }) {
  if (annotations.length === 0) {
    return (
      <Panel title="Gene Ontology (QuickGO)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No Gene Ontology annotations found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Gene Ontology (QuickGO)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {annotations.map((ann, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${aspectColor(ann.goAspect)}`}>
                {ann.goAspect}
              </span>
              <span className="text-xs font-mono text-slate-400">{ann.goId}</span>
            </div>
            <p className="text-sm text-slate-200 mt-1">{ann.goName}</p>
            {ann.qualifier && (
              <p className="text-xs text-slate-400 mt-0.5">{ann.qualifier}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              {ann.evidence && (
                <span className="text-xs font-mono text-slate-500">{ann.evidence}</span>
              )}
              <a
                href={ann.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View in QuickGO →
              </a>
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
