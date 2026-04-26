'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { PathwayMiniGraph } from '@/components/charts/PathwayMiniGraph'
import type { ReactomePathway } from '@/lib/types'

interface Props {
  pathways: ReactomePathway[]
  moleculeName: string
  panelId?: string
  lastFetched?: Date
}

export const ReactomePanel = memo(function ReactomePanel({ pathways, moleculeName, panelId, lastFetched }: Props) {
  const [view, setView] = useState<'list' | 'graph'>('list')
  const isEmpty = pathways.length === 0

  return (
    <Panel
      title="Reactome Pathways"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No Reactome pathways found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all ${
                  view === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setView('graph')}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all ${
                  view === 'graph' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🕸️ Graph
              </button>
            </div>
            <div className="text-[10px] text-slate-500 italic">
              {pathways.length} biological processes mapped
            </div>
          </div>

          {view === 'graph' ? (
            <PathwayMiniGraph pathways={pathways} moleculeName={moleculeName} />
          ) : (
            <PaginatedList className="space-y-3">
              {pathways.map((pathway, i) => (
                <div key={i} className="py-3 border-b border-slate-700 last:border-0">
                  <a href={pathway.url} target="_blank" rel="noopener noreferrer"
                    className="font-semibold text-blue-400 hover:text-blue-300 text-sm">
                    {pathway.name}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-violet-900/40 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded">
                      {pathway.stId}
                    </span>
                    <span className="text-xs text-slate-500">{pathway.species}</span>
                  </div>
                  {pathway.summation && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pathway.summation}</p>
                  )}
                  <details className="mt-2">
                    <summary className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
                      View Diagram
                    </summary>
                    <div className="mt-2 bg-white rounded-lg p-2 overflow-hidden relative">
                      <Image
                        src={`https://reactome.org/ContentService/exporter/diagram/${pathway.stId}.png?quality=5&diagramProfile=Modern`}
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
          )}
        </>
      )}
    </Panel>
  )
})
