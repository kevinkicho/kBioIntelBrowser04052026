import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { SAbDabEntry } from '@/lib/types'

function EntryItem({ entry }: { entry: SAbDabEntry }) {
  const typeColors: Record<string, string> = {
    Fab: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
    scFv: 'bg-green-900/40 text-green-300 border-green-700/30',
    VHH: 'bg-purple-900/40 text-purple-300 border-purple-700/30',
    Nanobody: 'bg-purple-900/40 text-purple-300 border-purple-700/30',
    Fab2: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
    IgG: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
  }

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={`https://www.rcsb.org/structure/${entry.pdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded shrink-0 font-mono hover:bg-blue-800/50"
        >
          {entry.pdbId}
        </a>
        <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${typeColors[entry.antibodyType] || 'bg-slate-700/50 text-slate-300'}`}>
          {entry.antibodyType}
        </span>
      </div>

      {entry.antigen && (
        <h4 className="font-semibold text-slate-100 text-sm mt-2 line-clamp-1">
          Antigen: {entry.antigen}
        </h4>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
        <span className="bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
          {entry.antigenType}
        </span>
        {entry.resolution > 0 && (
          <span className="bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
            {entry.resolution.toFixed(2)}Å
          </span>
        )}
      </div>

      {entry.species.length > 0 && (
        <p className="text-xs text-slate-400 mt-1">
          <span className="text-slate-500">Species:</span> {entry.species.slice(0, 2).join(', ')}
          {entry.species.length > 2 && ` +${entry.species.length - 2} more`}
        </p>
      )}

      {(entry.heavyChain || entry.lightChain) && (
        <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
          {entry.heavyChain && (
            <span className="bg-orange-900/40 text-orange-300 border border-orange-700/30 px-1.5 py-0.5 rounded">
              VH: {entry.heavyChain}
            </span>
          )}
          {entry.lightChain && (
            <span className="bg-pink-900/40 text-pink-300 border border-pink-700/30 px-1.5 py-0.5 rounded">
              VL: {entry.lightChain}
            </span>
          )}
        </div>
      )}

      {(entry.cdrSequences.heavy.cdr3 || entry.cdrSequences.light.cdr3) && (
        <div className="mt-2 space-y-1">
          {entry.cdrSequences.heavy.cdr3 && (
            <p className="text-xs text-slate-400">
              <span className="text-orange-400">H-CDR3:</span> <span className="font-mono">{entry.cdrSequences.heavy.cdr3}</span>
            </p>
          )}
          {entry.cdrSequences.light.cdr3 && (
            <p className="text-xs text-slate-400">
              <span className="text-pink-400">L-CDR3:</span> <span className="font-mono">{entry.cdrSequences.light.cdr3}</span>
            </p>
          )}
        </div>
      )}

      {entry.affinity !== null && (
        <p className="text-xs text-cyan-400 mt-2">
          Affinity: {entry.affinity} {entry.affinityUnits}
        </p>
      )}

      <div className="flex gap-3 mt-2">
        <a
          href={`https://www.rcsb.org/structure/${entry.pdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          PDB Structure →
        </a>
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-slate-300"
        >
          SAbDab Details →
        </a>
      </div>
    </div>
  )
}

export const SAbDabPanel = memo(function SAbDabPanel({ entries, panelId, lastFetched }: { entries: SAbDabEntry[], panelId?: string, lastFetched?: Date }) {
  if (entries.length === 0) {
    return (
      <Panel title="SAbDab" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No antibody structure data found for this molecule.</p>
      </Panel>
    )
  }

  const typeCounts = entries.reduce((acc, e) => {
    acc[e.antibodyType] = (acc[e.antibodyType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const withAffinity = entries.filter(e => e.affinity !== null).length

  return (
    <Panel title="SAbDab" panelId={panelId} lastFetched={lastFetched}>
      <p className="text-xs text-slate-400 mb-3">
        Structural Antibody Database — {entries.length} structure{entries.length !== 1 ? 's' : ''}
        {withAffinity > 0 && <span className="text-cyan-400 ml-2">{withAffinity} with affinity data</span>}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(typeCounts).map(([type, count]) => (
          <span key={type} className="text-xs bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
            {type}: {count}
          </span>
        ))}
      </div>

      <PaginatedList className="space-y-2">
        {entries.map((entry, i) => (
          <EntryItem key={`${entry.pdbId}-${i}`} entry={entry} />
        ))}
      </PaginatedList>
    </Panel>
  )
})