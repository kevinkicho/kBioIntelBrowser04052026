import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MonarchDisease } from '@/lib/types'

export const MonarchPanel = memo(function MonarchPanel({ diseases, panelId, lastFetched }: { diseases: MonarchDisease[], panelId?: string, lastFetched?: Date }) {
  if (diseases.length === 0) {
    return (
      <Panel title="Disease Associations (Monarch)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No Monarch disease associations found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Disease Associations (Monarch)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {diseases.map((disease, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded">
                {disease.id}
              </span>
            </div>
            <p className="text-sm text-slate-200 mt-1 font-medium">{disease.name}</p>
            {disease.description && (
              <p className="text-xs text-slate-500 mt-1">
                {disease.description.length > 150
                  ? disease.description.slice(0, 150) + '…'
                  : disease.description}
              </p>
            )}
            {disease.phenotypeCount !== undefined && disease.phenotypeCount > 0 && (
              <p className="text-xs text-slate-400 mt-1">Phenotypes: {disease.phenotypeCount}</p>
            )}
            <a
              href={disease.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
            >
              View on Monarch →
            </a>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
