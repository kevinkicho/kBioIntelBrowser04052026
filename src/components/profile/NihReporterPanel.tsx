import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { NihGrant } from '@/lib/types'

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US')
}

export const NihReporterPanel = memo(function NihReporterPanel({ grants, panelId, lastFetched }: { grants: NihGrant[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = grants.length === 0
  return (
    <Panel
      title="NIH Grants"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No NIH grants found for this molecule." : undefined}
    >
      {!isEmpty && (
        <PaginatedList className="space-y-3">
          {grants.map((grant, i) => (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">{grant.title}</p>
                <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/30 px-2 py-0.5 rounded shrink-0">
                  {grant.projectNumber}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{grant.piName}</p>
              <p className="text-xs text-slate-500 mt-1">{grant.institute}</p>
              {grant.fundingAmount > 0 && (
                <p className="text-xs text-emerald-400 mt-1">${formatCurrency(grant.fundingAmount)}</p>
              )}
              {grant.startDate && (
                <p className="text-xs text-slate-600 mt-1">{grant.startDate} – {grant.endDate}</p>
              )}
            </div>
          ))}
        </PaginatedList>
      )}
    </Panel>
  )
})
