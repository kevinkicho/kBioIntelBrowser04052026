'use client'

import { useState, useEffect } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import type { ChemblActivity, RelatedCompound } from '@/lib/types'

interface Props {
  activities: ChemblActivity[]
  currentChemblId: string
}

export function CompetitiveLandscape({ activities, currentChemblId }: Props) {
  const [targetMolecules, setTargetMolecules] = useState<Record<string, RelatedCompound[]>>({})
  const [loading, setLoading] = useState(true)

  // Extract unique targets with significant activity
  const topTargets = Array.from(new Set(activities.map(a => a.targetChemblId)))
    .slice(0, 3) // Limit to top 3 targets for density

  useEffect(() => {
    if (topTargets.length === 0) {
      setLoading(false)
      return
    }

    async function fetchCompettivity() {
      const results: Record<string, RelatedCompound[]> = {}
      for (const targetId of topTargets) {
        try {
          const res = await clientFetch(`/api/competitive/${targetId}`)
          if (res.ok) {
            const data = await res.json()
            // Filter out the current molecule and limit to top 5 competitors
            results[targetId] = data
              .filter((c: RelatedCompound) => c.chemblId !== currentChemblId)
              .slice(0, 5)
          }
        } catch (e) {
          console.error('Failed to fetch competitive data for', targetId, e)
        }
      }
      setTargetMolecules(results)
      setLoading(false)
    }

    fetchCompettivity()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, currentChemblId])

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 animate-pulse h-64">
        <div className="h-4 w-32 bg-slate-700 mb-4 rounded" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-700/50 rounded" />)}
        </div>
      </div>
    )
  }

  if (Object.keys(targetMolecules).length === 0) return null

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 overflow-hidden">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
        <span>🏟️ Competitive Landscape</span>
        <span className="text-[10px] lowercase font-normal text-slate-500">(based on shared targets)</span>
      </h3>

      <div className="space-y-6">
        {topTargets.map(targetId => {
          const competitors = targetMolecules[targetId]
          const targetName = activities.find(a => a.targetChemblId === targetId)?.targetName || targetId
          if (!competitors || competitors.length === 0) return null

          return (
            <div key={targetId}>
              <div className="text-[11px] font-medium text-indigo-400 mb-2 truncate" title={targetName}>
                Target: {targetName}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {competitors.map((comp, idx) => (
                  <div 
                    key={`${targetId}-${comp.chemblId}-${idx}`}
                    className="flex items-center justify-between p-2 rounded bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-slate-200 truncate group-hover:text-indigo-300">
                        {comp.name}
                      </span>
                      <span className="text-[10px] text-slate-500">Phase {comp.maxPhase}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono text-emerald-400">
                        {typeof comp.activityValue === 'number' && comp.activityValue > 0 
                          ? `${comp.activityValue.toFixed(1)}nM` 
                          : 'Active'}
                      </div>
                      <div className="text-[9px] text-slate-600 uppercase">{comp.activityType}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
