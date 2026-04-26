import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { UniprotEntry } from '@/lib/types'

export const UniprotPanel = memo(function UniprotPanel({ entries, panelId, lastFetched }: { entries: UniprotEntry[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = entries.length === 0
  return (
    <Panel
      title="Gene & Protein (UniProt)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No protein/gene data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {entries.map((entry, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">{entry.proteinName}</p>
                {entry.geneName && (
                  <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/30 px-2 py-0.5 rounded shrink-0">
                    {entry.geneName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{entry.organism}</p>
              {entry.functionSummary && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{entry.functionSummary}</p>
              )}
              <a
                href={`https://www.uniprot.org/uniprotkb/${entry.accession}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
              >
                {entry.accession}
              </a>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
