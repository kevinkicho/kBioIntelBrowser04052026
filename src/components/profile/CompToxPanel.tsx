import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { CompToxData } from '@/lib/types'

export const CompToxPanel = memo(function CompToxPanel({ data, panelId, lastFetched }: { data: CompToxData | null, panelId?: string, lastFetched?: Date }) {
  const isEmpty = !data

  return (
    <Panel
      title="EPA CompTox Dashboard"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No CompTox data available for this molecule." : undefined}
    >
      {!isEmpty && data && (() => {
        const pct = data.toxcastTotal > 0 ? (data.toxcastActive / data.toxcastTotal) * 100 : 0
        return (
          <div className="space-y-4">
            {data.casNumber && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CAS Number</span>
                <div className="mt-1">
                  <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/30 px-2 py-0.5 rounded font-mono">
                    {data.casNumber}
                  </span>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ToxCast Activity</span>
                <span className="text-sm text-slate-200 font-mono">
                  {data.toxcastActive} / {data.toxcastTotal}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{pct.toFixed(1)}% active assays</p>
            </div>

            {data.exposurePrediction && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Exposure Prediction</span>
                <p className="text-sm text-slate-300 mt-1">{data.exposurePrediction}</p>
              </div>
            )}

            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-cyan-400 hover:text-cyan-300 underline"
            >
              View on CompTox Dashboard →
            </a>
          </div>
        )
      })()}
    </Panel>
  )
})
