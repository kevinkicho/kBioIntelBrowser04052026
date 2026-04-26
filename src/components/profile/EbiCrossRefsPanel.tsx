'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { CrossReference } from '@/lib/api/ebi-proteins-variation'

interface EbiCrossRefsPanelProps {
  data: CrossReference | null
  panelId: string
  lastFetched?: Date
}

export const EbiCrossRefsPanel = memo(function EbiCrossRefsPanel({ data, panelId, lastFetched }: EbiCrossRefsPanelProps) {
  const grouped = useMemo(() => {
    if (!data?.crossReferences?.length) return {}
    const map: Record<string, { id: string; url: string }[]> = {}
    for (const xr of data.crossReferences) {
      const db = xr.database || 'Other'
      if (!map[db]) map[db] = []
      map[db].push({ id: xr.id, url: xr.url || '#' })
    }
    return map
  }, [data])

  const isEmpty = !data?.crossReferences?.length

  return (
    <Panel
      title="EBI Cross-Refs"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No cross-reference data available." : undefined}
    >
      {!isEmpty && data && (() => {
        const databases = Object.keys(grouped).sort()
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-mono">{data.accession}</span>
              {data.entryName && <><span className="text-slate-700">|</span><span>{data.entryName}</span></>}
              <span className="ml-auto">{data.crossReferences.length} cross-ref{data.crossReferences.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-3">
              {databases.map(db => (
                <div key={db}>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{db} ({grouped[db].length})</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {grouped[db].map((xr, idx) => (
                      <a
                        key={idx}
                        href={xr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 rounded hover:text-indigo-200 hover:border-indigo-600/50 transition-colors"
                      >
                        {xr.id}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </Panel>
  )
})