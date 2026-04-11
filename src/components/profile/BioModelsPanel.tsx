import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { BioModelsModel } from '@/lib/types'

export const BioModelsPanel = memo(function BioModelsPanel({ models, panelId, lastFetched }: { models: BioModelsModel[], panelId?: string, lastFetched?: Date }) {
  if (models.length === 0) {
    return (
      <Panel title="BioModels" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No computational models found.</p>
      </Panel>
    )
  }

  return (
    <Panel title="BioModels" panelId={panelId} lastFetched={lastFetched}>
      <div className="mb-3 text-xs text-slate-400">
        SBML/CellML computational biology models
      </div>
      <PaginatedList className="space-y-3">
        {models.map((model, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-mono bg-indigo-900/30 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded shrink-0">
                {model.id}
              </span>
              {(model.formats?.length ?? 0) > 0 && (
                <span className="text-xs bg-slate-700/50 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded">
                  {model.formats.join(', ')}
                </span>
              )}
            </div>
            <p className="font-semibold text-slate-100 text-sm mt-1">{model.name}</p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{model.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>By {model.submitter}</span>
              <span>Updated: {new Date(model.lastUpdate).toLocaleDateString()}</span>
            </div>
            {(model.organisms?.length ?? 0) > 0 && model.organisms[0] && (
              <p className="text-xs text-slate-500 mt-1">Organisms: {model.organisms.slice(0, 3).join(', ')}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <a
                href={model.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View on BioModels →
              </a>
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
