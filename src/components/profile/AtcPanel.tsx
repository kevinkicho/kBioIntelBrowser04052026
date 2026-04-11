import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { AtcClassification } from '@/lib/types'

export const AtcPanel = memo(function AtcPanel({ classifications, panelId, lastFetched }: { classifications: AtcClassification[], panelId?: string, lastFetched?: Date }) {
  if (classifications.length === 0) {
    return (
      <Panel title="Drug Classification (WHO ATC)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No ATC classification found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Drug Classification (WHO ATC)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-2">
        {classifications.map((cls, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0">
            <span className="text-xs font-mono bg-teal-900/40 text-teal-300 border border-teal-700/30 px-2 py-0.5 rounded shrink-0">
              {cls.code}
            </span>
            <span className="text-sm text-slate-200">{cls.name}</span>
            <span className="text-xs text-slate-500 ml-auto">{cls.classType}</span>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
