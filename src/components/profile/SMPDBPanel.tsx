import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { SMPDBPathway } from '@/lib/types'

function PathwayItem({ pathway }: { pathway: SMPDBPathway }) {
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Metabolic': 'bg-blue-900/40 text-blue-300 border-blue-700/30',
      'Signaling': 'bg-purple-900/40 text-purple-300 border-purple-700/30',
      'Drug': 'bg-green-900/40 text-green-300 border-green-700/30',
      'Disease': 'bg-red-900/40 text-red-300 border-red-700/30',
    }
    return colors[type] || 'bg-slate-700/50 text-slate-300'
  }

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
        <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${getTypeColor(pathway.pathwayType)}`}>
          {pathway.pathwayType}
        </span>
      </div>
      {pathway.description && (
        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{pathway.description}</p>
      )}
      <p className="text-xs text-slate-500 mt-1">
        Organism: {pathway.organism}
      </p>
      {pathway.metabolites.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          Metabolites: {pathway.metabolites.slice(0, 3).join(', ')}
          {pathway.metabolites.length > 3 && ` +${pathway.metabolites.length - 3} more`}
        </p>
      )}
      {pathway.enzymes.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          Enzymes: {pathway.enzymes.slice(0, 2).join(', ')}
          {pathway.enzymes.length > 2 && ` +${pathway.enzymes.length - 2} more`}
        </p>
      )}
    </div>
  )
}

export const SMPDBPanel = memo(function SMPDBPanel({ pathways, panelId, lastFetched }: { pathways: SMPDBPathway[], panelId?: string, lastFetched?: Date }) {
  if (pathways.length === 0) {
    return (
      <Panel title="SMPDB" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No SMPDB pathways found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="SMPDB" panelId={panelId} lastFetched={lastFetched}>
      <p className="text-xs text-slate-400 mb-3">Small molecule pathways from SMPDB</p>
      <PaginatedList className="space-y-3">
        {pathways.map((pathway, i) => (
          <PathwayItem key={`${pathway.smpdbId}-${i}`} pathway={pathway} />
        ))}
      </PaginatedList>
    </Panel>
  )
})