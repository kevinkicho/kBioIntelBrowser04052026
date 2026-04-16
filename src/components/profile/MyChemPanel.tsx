import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MyChemAnnotation } from '@/lib/types'

interface MyChemPanelProps {
  chemicals?: MyChemAnnotation[]
  panelId?: string
  lastFetched?: Date
}

export const MyChemPanel = memo(function MyChemPanel({ chemicals, panelId, lastFetched }: MyChemPanelProps) {
  if (!chemicals || chemicals.length === 0) {
    return (
      <Panel title="MyChem" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No chemical annotations found for this molecule.</p>
      </Panel>
    )
  }

  function displayName(chem: MyChemAnnotation): string {
    if (chem.name) return chem.name
    if (chem.chebi?.name) return chem.chebi.name
    const firstId = chem.chemblId || chem.chebiId || chem.drugbankId || chem.pubchemCid
    return firstId || 'Unknown compound'
  }

  return (
    <Panel title="MyChem.info Annotations" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-2">
        {chemicals.map((chem, idx) => (
          <div key={idx} className="py-2 border-b border-slate-700/50 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-slate-200">{displayName(chem)}</h4>
                {chem.inchiKey && (
                  <p className="text-xs font-mono text-slate-500 mt-0.5">{chem.inchiKey}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {chem.chemblId && (
                    <a
                      href={`https://www.ebi.ac.uk/chembl/compound_report_card/${chem.chemblId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded hover:bg-green-900/70"
                    >
                      ChEMBL: {chem.chemblId}
                    </a>
                  )}
                  {chem.pubchemCid && (
                    <a
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${chem.pubchemCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded hover:bg-blue-900/70"
                    >
                      PubChem: {chem.pubchemCid}
                    </a>
                  )}
                  {chem.chebiId && (
                    <a
                      href={`https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${chem.chebiId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-1.5 py-0.5 bg-orange-900/50 text-orange-300 rounded hover:bg-orange-900/70"
                    >
                      ChEBI: {chem.chebiId}
                    </a>
                  )}
                  {chem.drugbankId && (
                    <a
                      href={`https://go.drugbank.com/drugs/${chem.drugbankId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded hover:bg-purple-900/70"
                    >
                      DrugBank: {chem.drugbankId}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-slate-400">
              {chem.formula && (
                <div>
                  <span className="text-slate-500">Formula:</span>{' '}
                  <span className="font-mono">{chem.formula}</span>
                </div>
              )}
              {chem.molecularWeight > 0 && (
                <div>
                  <span className="text-slate-500">MW:</span>{' '}
                  <span>{chem.molecularWeight.toFixed(2)} Da</span>
                </div>
              )}
              {chem.chembl?.maxPhase !== undefined && chem.chembl.maxPhase > 0 && (
                <div>
                  <span className="text-slate-500">Max Phase:</span>{' '}
                  <span>{chem.chembl.maxPhase}</span>
                </div>
              )}
            </div>

            {chem.synonyms && chem.synonyms.length > 0 && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                Synonyms: {chem.synonyms.slice(0, 5).join(', ')}
                {chem.synonyms.length > 5 && ` +${chem.synonyms.length - 5} more`}
              </p>
            )}

            {chem.drugbank?.groups && chem.drugbank.groups.length > 0 && (
              <div className="flex gap-1 mt-1">
                {chem.drugbank.groups.map((group) => (
                  <span
                    key={group}
                    className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded"
                  >
                    {group}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})