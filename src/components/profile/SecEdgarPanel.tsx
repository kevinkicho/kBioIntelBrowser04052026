import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { SecFiling } from '@/lib/types'

export const SecEdgarPanel = memo(function SecEdgarPanel({ filings, panelId, lastFetched }: { filings: SecFiling[], panelId?: string, lastFetched?: Date }) {
  if (filings.length === 0) {
    return (
      <Panel title="SEC Filings" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No SEC filings found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="SEC Filings" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {filings.map((filing, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-100 text-sm">{filing.companyName}</p>
              <span className="text-xs bg-orange-900/40 text-orange-300 border border-orange-700/30 px-2 py-0.5 rounded shrink-0">
                {filing.formType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Filed: {filing.filingDate}</p>
            {filing.description && (
              <p className="text-xs text-slate-600 mt-1">{filing.description}</p>
            )}
            {filing.url && (
              <a
                href={filing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
              >
                View on SEC.gov →
              </a>
            )}
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
