import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { PdbeLigand } from '@/lib/types'

export const PdbeLigandsPanel = memo(function PdbeLigandsPanel({ ligands, panelId, lastFetched }: { ligands: PdbeLigand[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = ligands.length === 0
  return (
    <Panel
      title="PDBe Ligands"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No PDBe ligand data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {ligands.map((ligand, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded">
                  {ligand.compId}
                </span>
              </div>
              <p className="text-sm text-slate-200 mt-1 font-medium">{ligand.name}</p>
              {ligand.formula && (
                <p className="text-xs text-slate-400 mt-1">Formula: {ligand.formula}</p>
              )}
              {ligand.molecularWeight > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">MW: {ligand.molecularWeight}</p>
              )}
              {ligand.inchiKey && (
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{ligand.inchiKey}</p>
              )}
              {ligand.drugbankId && (
                <p className="text-xs text-slate-500 mt-0.5">DrugBank: {ligand.drugbankId}</p>
              )}
              <a
                href={ligand.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                View on PDBe →
              </a>
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
