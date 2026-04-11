import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { PaginatedVirtualizedList } from '@/components/ui/VirtualizedList'
import type { AdverseEvent } from '@/lib/types'

const VIRTUALIZATION_THRESHOLD = 20

interface AdverseEventItemProps {
  event: AdverseEvent
  maxCount: number
}

function AdverseEventItem({ event, maxCount }: AdverseEventItemProps) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-200 capitalize">{event.reactionName}</span>
        <div className="flex items-center gap-2">
          {event.serious > 0 && (
            <span className="text-xs bg-red-900/40 text-red-300 border border-red-700/30 px-2 py-0.5 rounded">
              {event.serious} serious
            </span>
          )}
          <span className="text-xs text-slate-400">{event.count.toLocaleString()}</span>
        </div>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-1.5">
        <div
          className="bg-rose-500/60 h-1.5 rounded-full"
          style={{ width: `${Math.round((event.count / maxCount) * 100)}%` }}
        />
      </div>
    </div>
  )
}

export const AdverseEventsPanel = memo(function AdverseEventsPanel({ adverseEvents, panelId, lastFetched }: { adverseEvents: AdverseEvent[], panelId?: string, lastFetched?: Date }) {
  const maxCount = useMemo(() => Math.max(...adverseEvents.map(e => e.count), 1), [adverseEvents])

  if (adverseEvents.length === 0) {
    return (
      <Panel title="Adverse Events" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No adverse events found for this molecule.</p>
      </Panel>
    )
  }

  // Use virtualization for large datasets
  if (adverseEvents.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <Panel title="Adverse Events" panelId={panelId} lastFetched={lastFetched}>
        <PaginatedVirtualizedList
          items={adverseEvents}
          renderItem={(event, i) => <AdverseEventItem key={`${event.reactionName}-${i}`} event={event} maxCount={maxCount} />}
          initialCount={10}
          estimateSize={80}
          emptyMessage="No adverse events found for this molecule."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Adverse Events" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-2">
        {adverseEvents.map((event, i) => (
          <AdverseEventItem key={`${event.reactionName}-${i}`} event={event} maxCount={maxCount} />
        ))}
      </PaginatedList>
    </Panel>
  )
})