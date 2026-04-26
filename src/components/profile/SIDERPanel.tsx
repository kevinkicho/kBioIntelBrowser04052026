import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { SIDERSideEffect } from '@/lib/types'

interface SIDERPanelProps {
  sideEffects?: SIDERSideEffect[]
  panelId?: string
  lastFetched?: Date
}

export const SIDERPanel = memo(function SIDERPanel({ sideEffects, panelId, lastFetched }: SIDERPanelProps) {
  const isEmpty = !sideEffects || sideEffects.length === 0
  const title = isEmpty ? "SIDER" : `SIDER Side Effects (${sideEffects!.length})`

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No side effect data found for this molecule." : undefined}
    >
      {!isEmpty && sideEffects && (() => {
        // Group side effects by frequency for better display
        const groupedByFrequency = sideEffects.reduce((acc, effect) => {
          const freq = effect.frequency || 'Unknown'
          if (!acc[freq]) acc[freq] = []
          acc[freq].push(effect)
          return acc
        }, {} as Record<string, SIDERSideEffect[]>)

        const frequencyOrder = ['Very frequent', 'Frequent', 'Occasional', 'Rare', 'Very rare', 'Unknown']

        return (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {frequencyOrder.map((freq) => {
              const effects = groupedByFrequency[freq]
              if (!effects || effects.length === 0) return null

              return (
                <div key={freq}>
                  <h4 className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-2">
                    {freq}
                    <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
                      {effects.length}
                    </span>
                  </h4>
                  <div className="space-y-0.5 pl-2">
                    {effects.slice(0, 10).map((effect, idx) => (
                      <div key={idx} className="text-xs text-slate-400">
                        • {effect.sideEffectName}
                        {effect.meddraTerm && (
                          <span className="text-slate-500 ml-1">
                            ({effect.meddraTerm})
                          </span>
                        )}
                      </div>
                    ))}
                    {effects.length > 10 && (
                      <p className="text-xs text-slate-500">
                        +{effects.length - 10} more {freq.toLowerCase()} side effects
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </Panel>
  )
})