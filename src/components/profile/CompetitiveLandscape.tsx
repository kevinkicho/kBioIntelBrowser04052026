'use client'

import { useState, useEffect, useMemo } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import { chemblCompoundUrl, chemblTargetUrl, normalizeChemblId } from '@/lib/chemblLinks'
import type { ChemblActivity, RelatedCompound } from '@/lib/types'

interface Props {
  activities: ChemblActivity[]
  currentChemblId: string
}

function phaseLabel(phase: number | null | undefined): string {
  if (phase == null || !Number.isFinite(phase) || phase <= 0) return '—'
  if (phase >= 4) return 'Approved'
  return `Ph ${Math.floor(phase)}`
}

function formatActivity(comp: RelatedCompound): string {
  if (typeof comp.pchemblValue === 'number' && comp.pchemblValue > 0) {
    return `pChEMBL ${comp.pchemblValue.toFixed(1)}`
  }
  if (typeof comp.activityValue === 'number' && comp.activityValue > 0) {
    const units = (comp.activityUnits || 'nM').trim()
    const v = comp.activityValue
    if (v >= 1000 && units.toLowerCase() === 'nm') {
      return `${(v / 1000).toFixed(2)} µM`
    }
    if (v < 0.01 || v >= 10000) return `${v.toExponential(2)} ${units}`
    return `${Number.isInteger(v) ? v : v.toFixed(v < 10 ? 2 : 1)} ${units}`
  }
  return '—'
}

function displayName(comp: RelatedCompound): string {
  const n = (comp.name || comp.compoundName || '').trim()
  if (n && n !== comp.chemblId) return n
  return comp.chemblId || 'Unknown'
}

export function CompetitiveLandscape({ activities, currentChemblId }: Props) {
  const [targetMolecules, setTargetMolecules] = useState<Record<string, RelatedCompound[]>>({})
  const [loading, setLoading] = useState(true)

  const currentId = normalizeChemblId(currentChemblId) || currentChemblId

  // Prefer targets that appear most often / with measured IC50-like rows
  const topTargets = useMemo(() => {
    const counts = new Map<string, { count: number; name: string }>()
    for (const a of activities) {
      const id = normalizeChemblId(a.targetChemblId) || a.targetChemblId
      if (!id) continue
      const prev = counts.get(id)
      counts.set(id, {
        count: (prev?.count ?? 0) + 1,
        name: a.targetName || prev?.name || id,
      })
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([id, meta]) => ({ id, name: meta.name }))
  }, [activities])

  useEffect(() => {
    if (topTargets.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchCompetitivity() {
      const results: Record<string, RelatedCompound[]> = {}
      await Promise.all(
        topTargets.map(async ({ id }) => {
          try {
            const res = await clientFetch(`/api/competitive/${encodeURIComponent(id)}`)
            if (!res.ok) return
            const data = (await res.json()) as RelatedCompound[]
            if (!Array.isArray(data)) return
            results[id] = data
              .filter((c) => {
                const cid = normalizeChemblId(c.chemblId) || c.chemblId
                return cid && cid !== currentId
              })
              .slice(0, 8)
          } catch (e) {
            console.error('Failed to fetch competitive data for', id, e)
          }
        }),
      )
      if (!cancelled) {
        setTargetMolecules(results)
        setLoading(false)
      }
    }

    setLoading(true)
    fetchCompetitivity()
    return () => {
      cancelled = true
    }
  }, [topTargets, currentId])

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 animate-pulse h-64">
        <div className="h-4 w-40 bg-slate-700 mb-4 rounded" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 bg-slate-700/50 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const sections = topTargets
    .map((t) => ({
      ...t,
      competitors: targetMolecules[t.id] ?? [],
    }))
    .filter((s) => s.competitors.length > 0)

  if (sections.length === 0) return null

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-5 overflow-hidden">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-2">
        <span>Competitive Landscape</span>
      </h3>
      <p className="text-[11px] text-slate-500 mb-3">
        Other molecules with measured IC50 on shared ChEMBL targets (most potent / later phase first).
      </p>

      <div className="space-y-5">
        {sections.map(({ id, name, competitors }) => {
          const targetHref = chemblTargetUrl(id)
          return (
            <div key={id}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  {targetHref ? (
                    <a
                      href={targetHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 truncate block"
                      title={name}
                    >
                      Target: {name}
                      <span className="ml-1 text-[9px] text-indigo-500/80">↗</span>
                    </a>
                  ) : (
                    <div className="text-[11px] font-medium text-indigo-400 truncate" title={name}>
                      Target: {name}
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-slate-600">{id}</div>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0">
                  {competitors.length} competitor{competitors.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Aligned listview columns */}
              <div
                className="grid grid-cols-[minmax(0,1.4fr)_4.5rem_minmax(5.5rem,0.9fr)_3.5rem_2.5rem] gap-x-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                role="row"
              >
                <span>Compound</span>
                <span>Phase</span>
                <span>Potency</span>
                <span>Type</span>
                <span className="text-right">Open</span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {competitors.map((comp, idx) => {
                  const href =
                    comp.url ||
                    chemblCompoundUrl(comp.chemblId) ||
                    `https://www.ebi.ac.uk/chembl/explore/compound/${comp.chemblId}`
                  const label = displayName(comp)
                  const potency = formatActivity(comp)
                  const phase = phaseLabel(comp.maxPhase)
                  return (
                    <a
                      key={`${id}-${comp.chemblId}-${idx}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open ${label} in ChEMBL`}
                      className="grid grid-cols-[minmax(0,1.4fr)_4.5rem_minmax(5.5rem,0.9fr)_3.5rem_2.5rem] gap-x-2 items-center px-2 py-1.5 hover:bg-slate-900/50 transition-colors group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-100 group-hover:text-indigo-300 truncate">
                          {label}
                        </div>
                        {label !== comp.chemblId && (
                          <div className="text-[10px] font-mono text-slate-600 truncate">
                            {comp.chemblId}
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[11px] tabular-nums ${
                          comp.maxPhase >= 4
                            ? 'text-emerald-400'
                            : comp.maxPhase >= 2
                              ? 'text-amber-300/90'
                              : 'text-slate-500'
                        }`}
                      >
                        {phase}
                      </span>
                      <span className="text-xs font-mono text-emerald-400/95 tabular-nums truncate">
                        {potency}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase truncate">
                        {comp.activityType || 'IC50'}
                      </span>
                      <span className="text-[11px] text-cyan-400 group-hover:text-cyan-300 text-right">
                        ↗
                      </span>
                    </a>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
