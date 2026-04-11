import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { ProteinAtlasEntry } from '@/lib/types'

export const ProteinAtlasPanel = memo(function ProteinAtlasPanel({ entries, panelId, lastFetched }: { entries: ProteinAtlasEntry[], panelId?: string, lastFetched?: Date }) {
  if (entries.length === 0) {
    return (
      <Panel title="Human Protein Atlas" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No Human Protein Atlas data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Human Protein Atlas" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {entries.map((entry, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-mono bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
                {entry.gene}
              </span>
              {entry.uniprotId && (
                <span className="text-xs font-mono text-slate-400">{entry.uniprotId}</span>
              )}
            </div>
            {entry.subcellularLocations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.subcellularLocations.map((loc, j) => (
                  <span
                    key={j}
                    className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded"
                  >
                    {loc}
                  </span>
                ))}
              </div>
            )}
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
            >
              View in Protein Atlas →
            </a>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
