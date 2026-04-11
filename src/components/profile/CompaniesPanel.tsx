import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { CompanyProduct } from '@/lib/types'

export const CompaniesPanel = memo(function CompaniesPanel({ companies, panelId, lastFetched }: { companies: CompanyProduct[], panelId?: string, lastFetched?: Date }) {
  if (companies.length === 0) {
    return (
      <Panel title="Companies & Products" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No approved products found in openFDA for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Companies & Products" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {companies.map((product, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-slate-700 last:border-0">
            <div>
              <p className="font-semibold text-slate-100">{product.brandName}</p>
              <p className="text-sm text-slate-400">{product.company}</p>
            </div>
            <div className="text-right">
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{product.route}</span>
              <p className="text-xs text-slate-500 mt-1">{product.genericName}</p>
              {product.applicationNumber && (
                <p className="text-xs text-slate-600 mt-0.5">{product.applicationNumber}</p>
              )}
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
