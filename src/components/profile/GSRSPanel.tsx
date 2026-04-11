import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GSRSSubstance } from '@/lib/types'

interface GSRSPanelProps {
  substances?: GSRSSubstance[]
  panelId?: string
  lastFetched?: Date
}

export const GSRSPanel = memo(function GSRSPanel({ substances, panelId, lastFetched }: GSRSPanelProps) {
  if (!substances || substances.length === 0) {
    return (
      <Panel title="GSRS - FDA UNII Registry" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No UNII substances found. GSRS is the FDA&apos;s Global Substance Registration System.</p>
      </Panel>
    )
  }

  return (
    <Panel title="GSRS - FDA UNII Registry" panelId={panelId} lastFetched={lastFetched} className="space-y-4">
      <p className="text-sm text-slate-400">
        Substances from the FDA&apos;s Global Substance Registration System with UNII identifiers.
      </p>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          UNII Substances ({substances.length})
        </h3>
        <PaginatedList pageSize={5}>
          {substances.map((substance) => (
            <div
              key={substance.unii}
              className="p-4 rounded-lg bg-slate-800/30 border border-slate-700"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-100">{substance.name}</h4>
                  <p className="text-xs text-slate-400">UNII: {substance.unii}</p>
                </div>
                <a
                  href={substance.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
                >
                  View →
                </a>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded">
                  {substance.type}
                </span>
              </div>

              {substance.structure.smiles && (
                <p className="text-xs text-slate-400 mb-1">
                  <span className="font-medium text-slate-100">SMILES:</span> {substance.structure.smiles}
                </p>
              )}

              {substance.structure.formula && (
                <p className="text-xs text-slate-400 mb-1">
                  <span className="font-medium text-slate-100">Formula:</span> {substance.structure.formula}
                </p>
              )}

              {substance.synonyms.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-400 mb-1">Synonyms:</p>
                  <div className="flex flex-wrap gap-1">
                    {substance.synonyms.slice(0, 5).map((synonym, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded"
                      >
                        {synonym}
                      </span>
                    ))}
                    {substance.synonyms.length > 5 && (
                      <span className="px-2 py-0.5 text-xs text-slate-500">
                        +{substance.synonyms.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </PaginatedList>
      </div>
    </Panel>
  )
})
