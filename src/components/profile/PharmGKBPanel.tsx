import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { PharmGKBDrug } from '@/lib/types'

function DrugItem({ drug }: { drug: PharmGKBDrug }) {
  const levelColors: Record<string, string> = {
    'Level 1A': 'bg-green-900/40 text-green-300 border-green-700/30',
    'Level 1B': 'bg-green-800/40 text-green-200 border-green-600/30',
    'Level 2A': 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
    'Level 2B': 'bg-yellow-800/40 text-yellow-200 border-yellow-600/30',
    'Level 3': 'bg-blue-900/40 text-blue-300 border-blue-700/30',
    'Level 4': 'bg-slate-700/50 text-slate-300 border-slate-600/30',
  }

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={drug.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
          >
            {drug.name}
          </a>
          {drug.drugClass && (
            <p className="text-xs text-slate-400 mt-0.5">{drug.drugClass}</p>
          )}
        </div>
        {drug.genes.length > 0 && (
          <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/30 px-2 py-0.5 rounded shrink-0">
            {drug.genes.length} gene{drug.genes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {drug.genericNames.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          <span className="text-slate-400">Generic:</span> {drug.genericNames.slice(0, 3).join(', ')}
          {drug.genericNames.length > 3 && ` +${drug.genericNames.length - 3} more`}
        </p>
      )}
      {drug.brandNames.length > 0 && (
        <p className="text-xs text-slate-500 mt-0.5">
          <span className="text-slate-400">Brand:</span> {drug.brandNames.slice(0, 3).join(', ')}
          {drug.brandNames.length > 3 && ` +${drug.brandNames.length - 3} more`}
        </p>
      )}
      {drug.genes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {drug.genes.slice(0, 5).map((g, i) => (
            <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${levelColors[g.level] || 'bg-slate-700/50 text-slate-300'}`}>
              {g.geneSymbol}
            </span>
          ))}
          {drug.genes.length > 5 && (
            <span className="text-xs text-slate-400 px-1.5 py-0.5">+{drug.genes.length - 5} more</span>
          )}
        </div>
      )}
      {drug.guidelines.length > 0 && (
        <p className="text-xs text-slate-400 mt-2">
          {drug.guidelines.length} clinical guideline{drug.guidelines.length !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  )
}

export const PharmGKBPanel = memo(function PharmGKBPanel({ drugs, panelId, lastFetched }: { drugs: PharmGKBDrug[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = drugs.length === 0

  return (
    <Panel
      title="PharmGKB"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No pharmacogenomic data found for this molecule." : undefined}
    >
      {!isEmpty && (() => {
        const totalGenes = drugs.reduce((sum, d) => sum + d.genes.length, 0)
        const totalGuidelines = drugs.reduce((sum, d) => sum + d.guidelines.length, 0)
        return (
          <>
            <p className="text-xs text-slate-400 mb-3">
              Pharmacogenomics Knowledgebase — {drugs.length} drug{drugs.length !== 1 ? 's' : ''}
              {totalGenes > 0 && <span className="text-purple-400 ml-2">{totalGenes} gene associations</span>}
              {totalGuidelines > 0 && <span className="text-cyan-400 ml-2">{totalGuidelines} guidelines</span>}
            </p>
            <PaginatedList className="space-y-2">
              {drugs.map((drug, i) => (
                <DrugItem key={`${drug.id}-${i}`} drug={drug} />
              ))}
            </PaginatedList>
          </>
        )
      })()}
    </Panel>
  )
})