'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { ClinVarVariant } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

function significanceBadgeColor(sig: string): string {
  const lower = sig.toLowerCase()
  if (lower === 'pathogenic') return 'bg-red-900/40 text-red-300 border-red-700/30'
  if (lower === 'likely pathogenic') return 'bg-rose-900/40 text-rose-300 border-rose-700/30'
  if (lower === 'drug response') return 'bg-amber-900/40 text-amber-300 border-amber-700/30'
  if (lower === 'benign' || lower === 'likely benign') return 'bg-slate-700/60 text-slate-300 border-slate-600/40'
  return 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30'
}

export const ClinVarPanel = memo(function ClinVarPanel({ variants, panelId, lastFetched }: { variants: ClinVarVariant[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = variants.length === 0
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<ClinVarVariant>((v) => v.title || v.variantId),
      ...alphaSortOptions<ClinVarVariant>((v) => v.clinicalSignificance || '').map((o) => ({
        ...o,
        id: `sig-${o.id}`,
        label: o.id.includes('asc') ? 'Significance A–Z' : 'Significance Z–A',
      })),
      ...alphaSortOptions<ClinVarVariant>((v) => v.gene || v.geneSymbol || '').map((o) => ({
        ...o,
        id: `gene-${o.id}`,
        label: o.id.includes('asc') ? 'Gene A–Z' : 'Gene Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="ClinVar Variants"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No ClinVar variants found for this molecule." : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={variants}
          getSearchText={(v) =>
            [v.title, v.variantId, v.clinicalSignificance, v.gene, v.geneSymbol, v.condition, v.conditionName, v.reviewStatus]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter variants…"
          getKey={(v, i) => `${v.variantId || v.title}-${i}`}
          className="space-y-3"
          renderItem={(variant) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
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
          )}
        />
      )}
    </Panel>
  )
})
