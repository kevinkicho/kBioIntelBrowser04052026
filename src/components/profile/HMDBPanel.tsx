import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { HMDBMetabolite } from '@/lib/types'

interface HMDBPanelProps {
  metabolites?: HMDBMetabolite[]
  panelId?: string
  lastFetched?: Date
}

export const HMDBPanel = memo(function HMDBPanel({ metabolites, panelId, lastFetched }: HMDBPanelProps) {
  if (!metabolites || metabolites.length === 0) {
    return (
      <Panel title="HMDB" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No metabolite data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="HMDB Metabolites" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-2">
        {metabolites.map((metabolite, idx) => (
          <div key={idx} className="py-2 border-b border-slate-700/50 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={metabolite.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    {metabolite.name}
                  </a>
                  <span className="text-xs px-2 py-0.5 bg-teal-900/50 text-teal-300 rounded">
                    {metabolite.hmdbId}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-slate-400">
                  {metabolite.formula && (
                    <div>
                      <span className="text-slate-500">Formula:</span>{' '}
                      <span className="font-mono">{metabolite.formula}</span>
                    </div>
                  )}
                  {metabolite.molecularWeight > 0 && (
                    <div>
                      <span className="text-slate-500">MW:</span>{' '}
                      <span>{metabolite.molecularWeight.toFixed(2)} Da</span>
                    </div>
                  )}
                </div>

                {metabolite.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{metabolite.description}</p>
                )}

                {metabolite.biospecimens.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Biospecimens: {metabolite.biospecimens.slice(0, 3).join(', ')}
                    {metabolite.biospecimens.length > 3 && ` +${metabolite.biospecimens.length - 3} more`}
                  </p>
                )}

                {metabolite.tissues.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Tissues: {metabolite.tissues.slice(0, 3).join(', ')}
                    {metabolite.tissues.length > 3 && ` +${metabolite.tissues.length - 3} more`}
                  </p>
                )}

                {metabolite.pathways.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Pathways: {metabolite.pathways.slice(0, 3).join(', ')}
                    {metabolite.pathways.length > 3 && ` +${metabolite.pathways.length - 3} more`}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})