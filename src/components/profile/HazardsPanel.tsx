import { memo } from 'react'
import Image from 'next/image'
import { Panel } from '@/components/ui/Panel'
import type { GhsHazardData } from '@/lib/types'

export const HazardsPanel = memo(function HazardsPanel({ hazards, panelId, lastFetched }: { hazards: GhsHazardData | null, panelId?: string, lastFetched?: Date }) {
  const isEmpty = !hazards
  return (
    <Panel
      title="Hazard Classification (GHS)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No GHS hazard data available for this molecule." : undefined}
    >
      {!isEmpty && hazards && (
        <div className="space-y-3">
          {hazards.signalWord && (
            <span className={`inline-block text-sm font-bold px-3 py-1 rounded ${
              hazards.signalWord === 'Danger'
                ? 'bg-red-900/40 text-red-300 border border-red-700/30'
                : 'bg-amber-900/40 text-amber-300 border border-amber-700/30'
            }`}>
              {hazards.signalWord}
            </span>
          )}

          {hazards.pictogramUrls && hazards.pictogramUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {hazards.pictogramUrls.map((url, i) => (
                <Image
                  key={i}
                  src={url}
                  alt="GHS pictogram"
                  width={48}
                  height={48}
                  className="w-12 h-12"
                  unoptimized
                />
              ))}
            </div>
          )}

          {hazards.hazardStatements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Hazard Statements</p>
              <ul className="space-y-1">
                {hazards.hazardStatements.map((stmt, i) => (
                  <li key={i} className="text-sm text-slate-300">{stmt}</li>
                ))}
              </ul>
            </div>
          )}

          {hazards.precautionaryStatements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Precautionary Statements</p>
              <ul className="space-y-1">
                {hazards.precautionaryStatements.map((stmt, i) => (
                  <li key={i} className="text-sm text-slate-300">{stmt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
})
