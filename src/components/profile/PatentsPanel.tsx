import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { PaginatedVirtualizedList } from '@/components/ui/VirtualizedList'
import type { Patent } from '@/lib/types'

const VIRTUALIZATION_THRESHOLD = 20

function PatentItem({ patent }: { patent: Patent }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-100 text-sm">{patent.title}</p>
        <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
          {patent.patentNumber}
        </span>
      </div>
      <p className="text-sm text-slate-400 mt-1">{patent.assignee}</p>
      {patent.filingDate && (
        <p className="text-xs text-slate-500 mt-1">Filed: {patent.filingDate}</p>
      )}
      {patent.abstract && (
        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{patent.abstract}</p>
      )}
    </div>
  )
}

export const PatentsPanel = memo(function PatentsPanel({ patents, panelId, lastFetched }: { patents: Patent[], panelId?: string, lastFetched?: Date }) {
  if (patents.length === 0) {
    return (
      <Panel title="USPTO Patents" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No patents found for this molecule.</p>
      </Panel>
    )
  }

  // Use virtualization for large datasets
  if (patents.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <Panel title="USPTO Patents" panelId={panelId} lastFetched={lastFetched}>
        <PaginatedVirtualizedList
          items={patents}
          renderItem={(patent) => <PatentItem key={patent.patentNumber} patent={patent} />}
          initialCount={10}
          estimateSize={120}
          emptyMessage="No patents found for this molecule."
        />
      </Panel>
    )
  }

  return (
    <Panel title="USPTO Patents" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {patents.map((patent, i) => (
          <PatentItem key={`${patent.patentNumber}-${i}`} patent={patent} />
        ))}
      </PaginatedList>
    </Panel>
  )
})
