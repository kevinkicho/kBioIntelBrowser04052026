import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { ClinGenGeneDisease, ClinGenVariant } from '@/lib/types'

interface ClinGenData {
  geneDiseases: ClinGenGeneDisease[]
  variants: ClinGenVariant[]
}

function GeneDiseaseItem({ item }: { item: ClinGenGeneDisease }) {
  const getValidityColor = (classification: string) => {
    const colors: Record<string, string> = {
      'Definitive': 'text-emerald-400',
      'Strong': 'text-green-400',
      'Moderate': 'text-yellow-400',
      'Limited': 'text-orange-400',
      'Disputed': 'text-red-400',
    }
    return colors[classification] || 'text-slate-400'
  }

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors"
        >
          {item.geneSymbol} - {item.diseaseName}
        </a>
        <span className={`text-xs font-medium ${getValidityColor(item.validityClassification)}`}>
          {item.validityClassification}
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        Mode of Inheritance: {item.modeOfInheritance}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Expert Panel: {item.expertPanel}
      </p>
    </div>
  )
}

function VariantItem({ variant }: { variant: ClinGenVariant }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={variant.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
        >
          {variant.variantName}
        </a>
        <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
          {variant.clinicalSignificance}
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        Gene: {variant.geneSymbol} • Condition: {variant.condition}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Review Status: {variant.reviewStatus}
      </p>
    </div>
  )
}

export const ClinGenPanel = memo(function ClinGenPanel({ data, panelId, lastFetched }: { data: ClinGenData, panelId?: string, lastFetched?: Date }) {
  const hasData = data.geneDiseases.length > 0 || data.variants.length > 0
  const isEmpty = !hasData

  return (
    <Panel
      title="ClinGen"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No ClinGen data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">Clinical genomics gene-disease validity</p>
          {data.geneDiseases.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Gene-Disease Associations</h4>
              <PaginatedList className="space-y-3">
                {data.geneDiseases.map((item, i) => (
                  <GeneDiseaseItem key={`${item.geneDiseaseId}-${i}`} item={item} />
                ))}
              </PaginatedList>
            </div>
          )}
          {data.variants.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Variants</h4>
              <PaginatedList className="space-y-3">
                {data.variants.map((variant, i) => (
                  <VariantItem key={`${variant.variantId}-${i}`} variant={variant} />
                ))}
              </PaginatedList>
            </div>
          )}
        </>
      )}
    </Panel>
  )
})