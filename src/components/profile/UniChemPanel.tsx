import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { UniChemMapping } from '@/lib/types'

interface UniChemPanelProps {
  mappings?: UniChemMapping[]
  panelId?: string
  lastFetched?: Date
}

export const UniChemPanel = memo(function UniChemPanel({ mappings, panelId, lastFetched }: UniChemPanelProps) {
  if (!mappings || mappings.length === 0) {
    return (
      <Panel title="UniChem Cross-References" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No cross-reference data found. UniChem provides mappings between chemical databases.</p>
      </Panel>
    )
  }

  return (
    <Panel title="UniChem Cross-References" panelId={panelId} lastFetched={lastFetched} className="space-y-4">
      <p className="text-sm text-slate-400">
        Cross-references from EMBL-EBI UniChem, mapping this compound across multiple chemical databases.
      </p>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Database Mappings ({mappings.length})
        </h3>
        <PaginatedList pageSize={10}>
          {mappings.map((mapping, idx) => (
            <div
              key={`${mapping.sourceId}-${mapping.externalId}-${idx}`}
              className="p-3 rounded-lg bg-slate-800/30 border border-slate-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 text-sm">{mapping.sourceName}</p>
                  <p className="text-xs text-slate-400 truncate">ID: {mapping.externalId}</p>
                </div>
                {mapping.url && (
                  <a
                    href={mapping.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
                  >
                    View →
                  </a>
                )}
              </div>
            </div>
          ))}
        </PaginatedList>
      </div>
    </Panel>
  )
})
