import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { PathwayCommonsResult } from '@/lib/types'

export const PathwayCommonsPanel = memo(function PathwayCommonsPanel({ results, panelId, lastFetched }: { results: PathwayCommonsResult[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = results.length === 0
  return (
    <Panel
      title="Pathway Commons"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No Pathway Commons data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {results.map((result, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                {result.dataSource && (
                  <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded">
                    {result.dataSource}
                  </span>
                )}
                <p className="font-semibold text-slate-100 text-sm">{result.name}</p>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">
                  Participants: <span className="text-slate-200 font-mono">{result.numParticipants}</span>
                </span>
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    View pathway →
                  </a>
                )}
              </div>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
