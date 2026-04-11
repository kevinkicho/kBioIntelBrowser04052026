import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { ChebiAnnotation } from '@/lib/types'

export const ChebiPanel = memo(function ChebiPanel({ annotation, panelId, lastFetched }: { annotation: ChebiAnnotation | null, panelId?: string, lastFetched?: Date }) {
  if (!annotation) {
    return (
      <Panel title="Chemical Ontology (ChEBI)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No ChEBI annotation found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Chemical Ontology (ChEBI)" panelId={panelId} lastFetched={lastFetched}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded shrink-0">
            {annotation.chebiId}
          </span>
          <span className="text-sm font-semibold text-slate-100">{annotation.name}</span>
        </div>

        {annotation.definition && (
          <p className="text-sm text-slate-300 leading-relaxed"
             dangerouslySetInnerHTML={{ __html: annotation.definition }}
          />
        )}

        {annotation.roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {annotation.roles.map((role, i) => (
              <span
                key={i}
                className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded"
              >
                {role}
              </span>
            ))}
          </div>
        )}

        <a
          href={annotation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-sky-400 hover:text-sky-300 transition-colors pt-1"
        >
          View on ChEBI →
        </a>
      </div>
    </Panel>
  )
})
