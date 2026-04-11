import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { PricingChart } from '@/components/charts/PricingChart'
import type { DrugPrice } from '@/lib/types'

function pharmacyBadgeClass(type: string): string {
  if (type === 'MAIL ORDER' || type === 'M') {
    return 'bg-violet-900/40 text-violet-300 border border-violet-700/30'
  }
  return 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/30'
}

function pharmacyLabel(type: string): string {
  if (type === 'R') return 'RETAIL'
  if (type === 'M') return 'MAIL ORDER'
  return type || 'RETAIL'
}

export const NadacPanel = memo(function NadacPanel({ prices, panelId, lastFetched }: { prices: DrugPrice[], panelId?: string, lastFetched?: Date }) {
  if (prices.length === 0) {
    return (
      <Panel title="CMS NADAC Drug Pricing" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No recent NADAC pricing data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="CMS NADAC Drug Pricing" panelId={panelId} lastFetched={lastFetched}>
      <PricingChart prices={prices} />
      <div className="mt-4">
      <PaginatedList className="space-y-3">
        {prices.map((price, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-100 text-sm">{price.ndcDescription}</p>
              <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${pharmacyBadgeClass(price.pharmacyType)}`}>
                {pharmacyLabel(price.pharmacyType)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-mono text-emerald-400">
                ${price.nadacPerUnit.toFixed(4)} / {price.pricingUnit || 'unit'}
              </span>
            </div>
            {price.effectiveDate && (
              <p className="text-xs text-slate-500 mt-1">Effective: {price.effectiveDate.slice(0, 10)}</p>
            )}
            <a
              href={price.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 underline mt-1 inline-block"
            >
              NADAC dataset →
            </a>
          </div>
        ))}
      </PaginatedList>
      </div>
    </Panel>
  )
})
