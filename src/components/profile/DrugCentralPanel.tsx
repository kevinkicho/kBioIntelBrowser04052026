import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { DrugCentralDrug, DrugCentralTarget, DrugCentralEnhanced } from '@/lib/types'

interface DrugCentralPanelProps {
  data?: {
    drug?: DrugCentralDrug | null
    targets?: DrugCentralTarget[]
  }
  enhancedData?: DrugCentralEnhanced | null
  panelId?: string
  lastFetched?: Date
}

export const DrugCentralPanel = memo(function DrugCentralPanel({ data, enhancedData, panelId, lastFetched }: DrugCentralPanelProps) {
  // Use enhanced data if available, otherwise fall back to basic data
  const drug = enhancedData?.drug ?? data?.drug ?? null
  const targets = enhancedData?.targets ?? data?.targets ?? []
  const indications = enhancedData?.indications ?? []
  const pharmacologicActions = enhancedData?.pharmacologicActions ?? []
  const atcCodes = enhancedData?.atcCodes ?? []
  const products = enhancedData?.products ?? []

  const isEmpty = !drug

  return (
    <Panel
      title="DrugCentral"
      panelId={panelId}
      lastFetched={lastFetched}
      className="space-y-4"
      empty={isEmpty ? "No DrugCentral data found for this molecule." : undefined}
    >
      {!isEmpty && drug && (
        <>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Drug Info</h3>
        <div className="text-sm text-slate-300">
          <p><span className="font-medium text-slate-100">Name:</span> {drug.name}</p>
          {drug.synonym.length > 0 && (
            <p><span className="font-medium text-slate-100">Synonyms:</span> {drug.synonym.slice(0, 5).join(', ')}</p>
          )}
          {(indications.length > 0 || drug.indication.length > 0) && (
            <p className="mt-1"><span className="font-medium text-slate-100">Indications:</span> {(indications.length > 0 ? indications : drug.indication).slice(0, 3).join(', ')}</p>
          )}
          {(pharmacologicActions.length > 0 || drug.actionType.length > 0) && (
            <p><span className="font-medium text-slate-100">Pharmacologic Actions:</span> {(pharmacologicActions.length > 0 ? pharmacologicActions : drug.actionType).join(', ')}</p>
          )}
          {drug.routes.length > 0 && (
            <p><span className="font-medium text-slate-100">Routes:</span> {drug.routes.join(', ')}</p>
          )}
          {(atcCodes.length > 0 || drug.atcCodes.length > 0) && (
            <p><span className="font-medium text-slate-100">ATC Codes:</span> {(atcCodes.length > 0 ? atcCodes : drug.atcCodes).join(', ')}</p>
          )}
        </div>
      </div>

      {products.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Products ({products.length})
          </h3>
          <PaginatedList className="space-y-2">
            {products.slice(0, 10).map((product) => (
              <div key={product.id} className="p-2 rounded-lg bg-slate-800/30 border border-slate-700">
                <p className="font-medium text-slate-100 text-sm">{product.name}</p>
                <p className="text-xs text-slate-400">{product.form} - {product.route}</p>
              </div>
            ))}
          </PaginatedList>
        </div>
      )}

      {targets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Targets ({targets.length})
          </h3>
          <PaginatedList className="space-y-2">
            {targets.map((target) => (
              <div key={target.targetId} className="p-2 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-100 text-sm">{target.targetName}</p>
                    <p className="text-xs text-slate-400">{target.geneSymbol}</p>
                  </div>
                  <span className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded shrink-0">
                    {target.actionCode}
                  </span>
                </div>
                {target.uniprotId && (
                  <a
                    href={`https://www.uniprot.org/uniprot/${target.uniprotId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                  >
                    UniProt: {target.uniprotId} →
                  </a>
                )}
              </div>
            ))}
          </PaginatedList>
        </div>
      )}

      {drug.faers && drug.faers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            FAERS Reports ({drug.faers.length})
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {drug.faers.slice(0, 10).map((report, i) => (
              <div key={i} className="text-xs flex items-center justify-between py-1 border-b border-slate-700">
                <span className="text-slate-300">{report.pt}</span>
                <span className="text-slate-500">{report.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </Panel>
  )
})
