import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { dbSNPVariant } from '@/lib/types'

function VariantItem({ variant }: { variant: dbSNPVariant }) {
  const getClinicalBadge = () => {
    if (!variant.clinical) return null
    const colors: Record<string, string> = {
      'pathogenic': 'bg-red-900/40 text-red-300 border-red-700/30',
      'likely pathogenic': 'bg-orange-900/40 text-orange-300 border-orange-700/30',
      'uncertain significance': 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
      'likely benign': 'bg-green-900/40 text-green-300 border-green-700/30',
      'benign': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
    }
    const color = colors[variant.clinicalSignificance.toLowerCase()] || 'bg-slate-700/50 text-slate-300'
    return (
      <span className={`text-xs border px-2 py-0.5 rounded ${color}`}>
        {variant.clinicalSignificance}
      </span>
    )
  }

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={variant.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
        >
          {variant.rsId}
        </a>
        {getClinicalBadge()}
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {variant.chromosome}:{variant.position} • {variant.alleles}
      </p>
      {variant.genes.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          Genes: {variant.genes.join(', ')}
        </p>
      )}
      {variant.frequency > 0 && (
        <p className="text-xs text-slate-600 mt-1">
          Frequency: {(variant.frequency * 100).toFixed(2)}%
        </p>
      )}
    </div>
  )
}

export const DbSNPPanel = memo(function DbSNPPanel({ variants, panelId, lastFetched }: { variants: dbSNPVariant[], panelId?: string, lastFetched?: Date }) {
  if (variants.length === 0) {
    return (
      <Panel title="dbSNP" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No genetic variants found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="dbSNP" panelId={panelId} lastFetched={lastFetched}>
      <p className="text-xs text-slate-400 mb-3">Genetic variants from NCBI dbSNP</p>
      <PaginatedList className="space-y-3">
        {variants.map((variant, i) => (
          <VariantItem key={`${variant.rsId}-${i}`} variant={variant} />
        ))}
      </PaginatedList>
    </Panel>
  )
})