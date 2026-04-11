import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GwasAssociation } from '@/lib/types'

function formatPValue(pValue: number): string {
  if (pValue === 0) return 'N/A'
  return pValue.toExponential(2)
}

export const GwasCatalogPanel = memo(function GwasCatalogPanel({ associations, panelId, lastFetched }: { associations: GwasAssociation[], panelId?: string, lastFetched?: Date }) {
  if (associations.length === 0) {
    return (
      <Panel title="GWAS Catalog" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No GWAS associations found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="GWAS Catalog" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {associations.map((assoc, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <p className="font-semibold text-slate-100 text-sm">{assoc.traitName}</p>

            <div className="flex items-center gap-2 mt-1">
              {assoc.riskAllele && (
                <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/30 px-2 py-0.5 rounded">
                  {assoc.riskAllele}
                </span>
              )}
              {assoc.region && (
                <span className="text-xs text-slate-400">Region: {assoc.region}</span>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-400">
                p-value: <span className="text-slate-200 font-mono">{formatPValue(assoc.pValue)}</span>
              </span>
              {assoc.url && (
                <a
                  href={assoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                >
                  View study →
                </a>
              )}
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
