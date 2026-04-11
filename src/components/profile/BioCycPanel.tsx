import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { BioCycPathway } from '@/lib/types'

function PathwayItem({ pathway }: { pathway: BioCycPathway }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={pathway.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {pathway.name}
        </a>
        <span className="text-xs bg-teal-900/40 text-teal-300 border border-teal-700/30 px-2 py-0.5 rounded shrink-0">
          {pathway.pathwayId}
        </span>
      </div>
      {pathway.description && (
        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{pathway.description}</p>
      )}
      {pathway.organism && (
        <p className="text-xs text-slate-500 mt-1">Organism: {pathway.organism}</p>
      )}
    </div>
  )
}

export const BioCycPanel = memo(function BioCycPanel({ pathways, panelId, lastFetched }: { pathways: BioCycPathway[], panelId?: string, lastFetched?: Date }) {
  if (pathways.length === 0) {
    return (
      <Panel title="BioCyc" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No BioCyc pathways found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="BioCyc" panelId={panelId} lastFetched={lastFetched}>
      <p className="text-xs text-slate-400 mb-3">Metabolic pathways from BioCyc</p>
      <PaginatedList className="space-y-3">
        {pathways.map((pathway, i) => (
          <PathwayItem key={`${pathway.pathwayId}-${i}`} pathway={pathway} />
        ))}
      </PaginatedList>
    </Panel>
  )
})