import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { CrossRefWork } from '@/lib/types'

function WorkItem({ work }: { work: CrossRefWork }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={work.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {work.title}
        </a>
        <span className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded shrink-0">
          {work.year || 'N/A'}
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {(work.authors?.slice(0, 3) ?? []).join(', ')}
        {(work.authors?.length ?? 0) > 3 && ` et al.`}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        {work.journal}
        {work.type && ` • ${work.type}`}
      </p>
      <div className="flex gap-4 mt-2 text-xs">
        <a
          href={work.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300"
        >
          DOI: {work.doi}
        </a>
        {work.isReferencedByCount > 0 && (
          <span className="text-slate-500">
            {work.isReferencedByCount.toLocaleString()} citations
          </span>
        )}
      </div>
    </div>
  )
}

export const CrossRefPanel = memo(function CrossRefPanel({ works, panelId, lastFetched }: { works: CrossRefWork[], panelId?: string, lastFetched?: Date }) {
  if (works.length === 0) {
    return (
      <Panel title="CrossRef" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No CrossRef publications found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="CrossRef" panelId={panelId} lastFetched={lastFetched}>
      <p className="text-xs text-slate-400 mb-3">DOI metadata from CrossRef</p>
      <PaginatedList className="space-y-3">
        {works.map((work, i) => (
          <WorkItem key={`${work.doi}-${i}`} work={work} />
        ))}
      </PaginatedList>
    </Panel>
  )
})