import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { ClinVarVariant } from '@/lib/types'

function significanceBadgeColor(sig: string): string {
  const lower = sig.toLowerCase()
  if (lower === 'pathogenic') return 'bg-red-900/40 text-red-300 border-red-700/30'
  if (lower === 'likely pathogenic') return 'bg-rose-900/40 text-rose-300 border-rose-700/30'
  if (lower === 'drug response') return 'bg-amber-900/40 text-amber-300 border-amber-700/30'
  if (lower === 'benign' || lower === 'likely benign') return 'bg-slate-700/60 text-slate-300 border-slate-600/40'
  return 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30'
}

export const ClinVarPanel = memo(function ClinVarPanel({ variants, panelId, lastFetched }: { variants: ClinVarVariant[], panelId?: string, lastFetched?: Date }) {
  if (variants.length === 0) {
    return (
      <Panel title="ClinVar Variants" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No ClinVar variants found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="ClinVar Variants" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {variants.map((variant, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${significanceBadgeColor(variant.clinicalSignificance)}`}>
                {variant.clinicalSignificance}
              </span>
              {variant.gene && (
                <span className="text-xs font-mono bg-slate-700/60 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded shrink-0">
                  {variant.gene}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">{variant.title}</p>
            {variant.condition && (
              <p className="text-xs text-slate-400 mt-1">{variant.condition}</p>
            )}
            {variant.reviewStatus && (
              <p className="text-xs text-slate-500 mt-0.5">{variant.reviewStatus}</p>
            )}
            <a
              href={variant.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
            >
              View in ClinVar →
            </a>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
