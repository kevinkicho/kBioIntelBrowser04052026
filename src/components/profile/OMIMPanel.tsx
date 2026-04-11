import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MoleculeData } from '@/lib/types'

interface OMIMPanelProps {
  data: MoleculeData
  panelId?: string
  lastFetched?: Date
}

export const OMIMPanel = memo(function OMIMPanel({ data, panelId, lastFetched }: OMIMPanelProps) {
  const entries = data.omimEntries ?? []

  if (entries.length === 0) {
    return (
      <Panel title="OMIM" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No OMIM entries found for this molecule.</p>
      </Panel>
    )
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'live':
        return 'bg-green-900/50 text-green-300'
      case 'removed':
        return 'bg-red-900/50 text-red-300'
      default:
        return 'bg-slate-700 text-slate-300'
    }
  }

  // Get prefix badge color
  const getPrefixColor = (prefix: string) => {
    switch (prefix) {
      case '*':
        return 'bg-purple-900/50 text-purple-300' // Gene
      case '#':
        return 'bg-blue-900/50 text-blue-300' // Phenotype
      case '+':
        return 'bg-green-900/50 text-green-300' // Gene and phenotype
      case '%':
        return 'bg-orange-900/50 text-orange-300' // Heritable phenotype
      default:
        return 'bg-slate-700 text-slate-300'
    }
  }

  return (
    <Panel title="OMIM Genetic Disorders" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-2">
        {entries.map((entry, idx) => (
          <div key={idx} className="py-2 border-b border-slate-700/50 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    {entry.name}
                  </a>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getPrefixColor(entry.prefix)}`}>
                    OMIM:{entry.mimNumber}
                  </span>
                </div>

                <div className="flex gap-1 mt-1">
                  {entry.status && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                  )}
                </div>

                {entry.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{entry.description}</p>
                )}

                {entry.geneSymbols && entry.geneSymbols.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Associated genes: {entry.geneSymbols.slice(0, 5).join(', ')}
                    {entry.geneSymbols.length > 5 && ` +${entry.geneSymbols.length - 5} more`}
                  </p>
                )}

                {entry.phenotypes && entry.phenotypes.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Phenotypes: {entry.phenotypes.slice(0, 3).map(p => p.name).join(', ')}
                    {entry.phenotypes.length > 3 && ` +${entry.phenotypes.length - 3} more`}
                  </p>
                )}

                {entry.references && entry.references.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {entry.references.length} references
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})