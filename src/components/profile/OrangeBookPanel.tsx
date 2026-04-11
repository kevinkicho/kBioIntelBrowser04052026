import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { OrangeBookEntry } from '@/lib/types'

export const OrangeBookPanel = memo(function OrangeBookPanel({ entries, panelId, lastFetched }: { entries: OrangeBookEntry[], panelId?: string, lastFetched?: Date }) {
  if (entries.length === 0) {
    return (
      <Panel title="FDA Orange Book" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No Orange Book entries found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="FDA Orange Book" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {entries.map((entry, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-100 text-sm">{entry.sponsorName}</p>
              <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
                {entry.applicationNumber}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {entry.dosageForm && <span className="text-xs text-slate-400">{entry.dosageForm}</span>}
              {entry.teCode && (
                <span className="text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 px-2 py-0.5 rounded">
                  TE: {entry.teCode}
                </span>
              )}
            </div>
            {entry.approvalDate && (
              <p className="text-xs text-slate-500 mt-1">Approved: {entry.approvalDate}</p>
            )}
            {entry.patents && entry.patents.length > 0 && (
              <div className="mt-2 space-y-1">
                {entry.patents.map((p, j) => (
                  <p key={j} className="text-xs text-slate-500">
                    Patent {p.patentNumber} — expires {p.expiryDate}
                  </p>
                ))}
              </div>
            )}
            {entry.exclusivities && entry.exclusivities.length > 0 && (
              <div className="mt-1 space-y-1">
                {entry.exclusivities.map((e, j) => (
                  <p key={j} className="text-xs text-amber-400">
                    Exclusivity {e.code} — expires {e.expiryDate}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
