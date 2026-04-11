import { memo } from 'react'
import Image from 'next/image'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { WikiPathway } from '@/lib/types'

export const WikiPathwaysPanel = memo(function WikiPathwaysPanel({ pathways, panelId, lastFetched }: { pathways: WikiPathway[], panelId?: string, lastFetched?: Date }) {
  if (pathways.length === 0) {
    return (
      <Panel title="WikiPathways" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No WikiPathways data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="WikiPathways" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {pathways.map((pathway, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded font-mono">
                  {pathway.id}
                </span>
                <p className="font-semibold text-slate-100 text-sm">{pathway.name}</p>
              </div>
              <a
                href={pathway.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
              >
                WikiPathways →
              </a>
            </div>
            <div className="mt-2">
              <span className="text-xs bg-slate-700/60 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded">
                {pathway.species}
              </span>
            </div>
            <details className="mt-2">
              <summary className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer">
                View Pathway
              </summary>
              <div className="mt-2 bg-white rounded-lg p-2 overflow-hidden relative">
                <Image
                  src={`https://www.wikipathways.org/wikipathways/wpi/wpi.php?action=downloadFile&type=png&pwTitle=Pathway:${pathway.id}`}
                  alt={`Diagram of ${pathway.name}`}
                  width={600}
                  height={256}
                  className="w-full h-auto max-h-64 object-contain"
                  loading="lazy"
                  unoptimized
                />
              </div>
            </details>
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
