'use client'

import { memo, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import { StructureViewer } from '@/components/charts/StructureViewer'
import type { PdbStructure } from '@/lib/types'

const methodColors: Record<string, string> = {
  'X-RAY DIFFRACTION': 'bg-sky-900/40 text-sky-300 border-sky-700/30',
  'ELECTRON MICROSCOPY': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  'SOLUTION NMR': 'bg-amber-900/40 text-amber-300 border-amber-700/30',
}

export const PdbPanel = memo(function PdbPanel({ structures, panelId, lastFetched }: { structures: PdbStructure[], panelId?: string, lastFetched?: Date }) {
  const [activeViewer, setActiveViewer] = useState<string | null>(null)

  if (structures.length === 0) {
    return (
      <Panel title="PDB Structures" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No PDB structures found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="PDB Structures" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {structures.map((structure, i) => {
          const colors = methodColors[structure.method] ?? 'bg-slate-700/40 text-slate-300 border-slate-600/30'
          const isViewerOpen = activeViewer === structure.pdbId
          return (
            <div key={i} className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <a href={structure.url} target="_blank" rel="noopener noreferrer"
                    className="font-semibold text-blue-400 hover:text-blue-300 text-sm">
                    {structure.pdbId}
                  </a>
                  <button
                    onClick={() => setActiveViewer(isViewerOpen ? null : structure.pdbId)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-all ${
                      isViewerOpen
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-indigo-900/30 text-indigo-400 border-indigo-800/40 hover:bg-indigo-800/40'
                    }`}
                  >
                    {isViewerOpen ? '✕ Close' : '🔬 View 3D'}
                  </button>
                </div>
                <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${colors}`}>
                  {structure.method}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{structure.title}</p>
              <div className="flex items-center gap-3 mt-1">
                {structure.resolution !== null && (
                  <span className="text-xs text-slate-500">{structure.resolution.toFixed(1)} Å</span>
                )}
                {structure.depositionDate && (
                  <span className="text-xs text-slate-500">{structure.depositionDate}</span>
                )}
              </div>
              {isViewerOpen && (
                <div className="mt-3 animate-[fadeSlideIn_0.2s_ease-out]">
                  <StructureViewer pdbId={structure.pdbId} />
                </div>
              )}
            </div>
          )
        })}
      </PaginatedList>
    </Panel>
  )
})


