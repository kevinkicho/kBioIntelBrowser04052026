'use client'

import { useState, useEffect, useMemo } from 'react'

interface PipelinePhase {
  phase: string
  phaseOrder: number
  reached: boolean
  details: string[]
}

interface PipelineData {
  clinicalTrials: Array<{ phase: string; status: string; sponsor: string; nctId: string }>
  chemblIndications: Array<{ condition: string; maxPhaseForIndication: number; maxPhase: number; meshHeading: string; efoTerm?: string }>
  chemblMechanisms: Array<{ mechanismOfAction: string; actionType: string; maxPhase: number; targetName: string }>
  orangeBookEntries: Array<{ applicationNumber: string; approvalDate: string; sponsorName: string; teCode?: string; dosageForm: string }>
  ndcProducts: Array<{ productType: string; marketingCategory: string; brandName: string; labelerName: string }>
  drugLabels: Array<{ title: string; labelerName?: string; publishedDate?: string }>
  drugShortages: Array<{ drugName: string; shortageStatus: string; shortageReason: string; estimatedResupplyDate?: string }>
  myChemAnnotations: Array<{ chembl?: { maxPhase: number; moleculeType: string }; drugbank?: { groups: string[] } }>
}

const PHASE_ORDER = ['Preclinical', 'Phase I', 'Phase II', 'Phase III', 'Approved', 'Marketed']

function parsePhaseNumber(raw: number): number {
  if (raw >= 4) return 4
  if (raw >= 3) return 3
  if (raw >= 2) return 2
  if (raw >= 1) return 1
  return 0
}

function formatAppType(appNum: string): string | null {
  const n = (appNum || '').toUpperCase()
  if (n.startsWith('NDA')) return 'NDA'
  if (n.startsWith('ANDA')) return 'ANDA'
  if (n.startsWith('BLA')) return 'BLA'
  if (n.includes('NDA')) return 'NDA'
  if (n.includes('ANDA')) return 'ANDA'
  if (n.includes('BLA')) return 'BLA'
  return null
}

export function PipelinePanel({ cid }: { cid: number }) {
  const [data, setData] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchPipeline() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/molecule/${cid}/pipeline`)
        if (!res.ok) throw new Error(`Failed to fetch pipeline data (${res.status})`)
        const json: PipelineData = await res.json()
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load pipeline data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPipeline()
    return () => { cancelled = true }
  }, [cid, retryKey])

  const pipeline = useMemo(() => {
    if (!data) return null
    const props = data

    const phases: PipelinePhase[] = PHASE_ORDER.map((name, i) => ({
      phase: name,
      phaseOrder: i,
      reached: false,
      details: [],
    }))

    let maxReached = -1
    const milestones: string[] = []
    let chemblMaxPhase = -1
    let marketingStatus = ''
    const appTypes: string[] = []
    const sponsors: string[] = []
    let firstApprovalDate = ''
    let shortageInfo = ''

    for (const m of props.chemblMechanisms) {
      const idx = parsePhaseNumber(m.maxPhase)
      if (idx > chemblMaxPhase) chemblMaxPhase = idx
    }
    for (const ind of props.chemblIndications) {
      const idx = parsePhaseNumber(ind.maxPhaseForIndication)
      if (idx > chemblMaxPhase) chemblMaxPhase = idx
    }
    for (const ann of props.myChemAnnotations) {
      if (ann.chembl?.maxPhase !== undefined) {
        const idx = parsePhaseNumber(ann.chembl.maxPhase)
        if (idx > chemblMaxPhase) chemblMaxPhase = idx
      }
      if (ann.drugbank?.groups) {
        for (const g of ann.drugbank.groups) {
          if (g.toLowerCase() === 'approved' || g.toLowerCase() === 'marketed') {
            if (chemblMaxPhase < 4) chemblMaxPhase = 4
          }
        }
      }
    }

    const trialPhaseCounts: Record<string, number> = { 'Phase I': 0, 'Phase II': 0, 'Phase III': 0, 'Phase IV': 0 }
    for (const t of props.clinicalTrials) {
      const p = (t.phase || '').toLowerCase()
      if (p.includes('phase 4') || p.includes('phase iv')) {
        trialPhaseCounts['Phase IV']++
        if (4 > maxReached) maxReached = 4
      } else if (p.includes('phase 3') || p.includes('phase iii')) {
        trialPhaseCounts['Phase III']++
        if (3 > maxReached) maxReached = 3
      } else if (p.includes('phase 2') || p.includes('phase ii')) {
        trialPhaseCounts['Phase II']++
        if (2 > maxReached) maxReached = 2
      } else if (p.includes('phase 1') || p.includes('phase i')) {
        trialPhaseCounts['Phase I']++
        if (1 > maxReached) maxReached = 1
      }
    }

    if (chemblMaxPhase > maxReached) maxReached = chemblMaxPhase

    const hasOrangeBook = props.orangeBookEntries.length > 0
    const hasNdc = props.ndcProducts.length > 0
    const hasLabels = props.drugLabels.length > 0

    if (hasOrangeBook) {
      if (maxReached < 4) maxReached = 4
      const earliest = props.orangeBookEntries
        .filter(e => e.approvalDate)
        .sort((a, b) => a.approvalDate.localeCompare(b.approvalDate))[0]
      if (earliest) {
        firstApprovalDate = earliest.approvalDate
        milestones.push(`First FDA approval: ${earliest.approvalDate}`)
      }
      for (const e of props.orangeBookEntries) {
        const t = formatAppType(e.applicationNumber)
        if (t && !appTypes.includes(t)) appTypes.push(t)
        if (e.sponsorName && !sponsors.includes(e.sponsorName)) sponsors.push(e.sponsorName)
        if (e.teCode) {
          milestones.push(`TE code ${e.teCode} (${e.dosageForm})`)
        }
      }
    }

    if (hasNdc) {
      const cats = new Set<string>()
      for (const p of props.ndcProducts) {
        const mc = p.marketingCategory || p.productType
        if (mc) cats.add(mc)
      }
      marketingStatus = Array.from(cats).join(', ')

      const marketed = props.ndcProducts.filter(p =>
        p.productType?.toLowerCase().includes('prescription') ||
        p.productType?.toLowerCase().includes('otc') ||
        p.marketingCategory?.toLowerCase().includes('nda') ||
        p.marketingCategory?.toLowerCase().includes('anda')
      )
      if (marketed.length > 0 && maxReached < 5) maxReached = 5
    }

    if (hasLabels) {
      if (maxReached < 4) maxReached = 4
    }

    if (props.drugShortages.length > 0) {
      const active = props.drugShortages.filter(s => s.shortageStatus !== 'Resolved')
      if (active.length > 0) {
        shortageInfo = `${active.length} active shortage${active.length > 1 ? 's' : ''}: ${active.map(s => s.shortageReason || s.shortageStatus).slice(0, 2).join('; ')}`
      }
    }

    if (maxReached >= 4) {
      phases[4].reached = true
      phases[4].details.push(hasOrangeBook
        ? `${props.orangeBookEntries.length} Orange Book entr${props.orangeBookEntries.length !== 1 ? 'ies' : 'y'}`
        : 'Marketed (ChEMBL/DrugBank)')
    }
    if (maxReached >= 5) {
      phases[5].reached = true
      phases[5].details.push(`${props.ndcProducts.length} NDC product${props.ndcProducts.length !== 1 ? 's' : ''}`)
    }

    if (chemblMaxPhase >= 0) {
      const idx = Math.min(chemblMaxPhase + 1, 4)
      if (!phases[idx].reached) phases[idx].reached = true
      phases[idx].details.push(`ChEMBL max phase: ${PHASE_ORDER[idx]}`)
    }

    for (const [phase, count] of Object.entries(trialPhaseCounts)) {
      if (count > 0) {
        const idx = phase === 'Phase IV' ? 4 : phase === 'Phase III' ? 3 : phase === 'Phase II' ? 2 : 1
        if (!phases[idx].reached) phases[idx].reached = true
        phases[idx].details.push(`${count} trial${count !== 1 ? 's' : ''}`)
      }
    }

    if (maxReached <= 0) {
      phases[0].reached = true
      phases[0].details.push('No human clinical data found')
    }

    const approvedIndications: string[] = []
    const investigationalIndications: string[] = []
    for (const ind of props.chemblIndications) {
      const p = ind.maxPhaseForIndication ?? ind.maxPhase ?? 0
      const name = ind.meshHeading || ind.condition || ind.efoTerm
      if (!name) continue
      if (p >= 4) {
        if (!approvedIndications.includes(name)) approvedIndications.push(name)
      } else if (p >= 1) {
        if (!investigationalIndications.includes(name)) investigationalIndications.push(name)
      }
    }

    return {
      phases,
      maxReached,
      milestones,
      chemblMaxPhase,
      marketingStatus,
      appTypes,
      sponsors: sponsors.slice(0, 5),
      firstApprovalDate,
      shortageInfo,
      approvedIndications,
      investigationalIndications,
    }
  }, [data])

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 mb-2 animate-pulse">
        <div className="h-4 w-48 bg-slate-700 rounded mb-4" />
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="h-2 w-12 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-800/50 rounded-lg p-3">
              <div className="h-2 w-16 bg-slate-700 rounded mb-2" />
              <div className="h-4 w-24 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 mb-2">
        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <span>🏗️</span> Regulatory & Development Pipeline
        </h3>
        <p className="text-xs text-red-400">{error}</p>
        <button
          onClick={() => { setRetryKey(k => k + 1) }}
          className="text-xs text-indigo-400 hover:text-indigo-300 mt-2"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!pipeline || pipeline.maxReached < 0) return null

  const p = pipeline

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 mb-2" role="region" aria-label="Regulatory and development pipeline">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <span aria-hidden="true">🏗️</span> Regulatory & Development Pipeline
      </h3>

      <div className="flex items-center gap-1 mb-4">
        {p.phases.map((phase, i) => {
          const isActive = phase.reached
          const isCurrentHighest = i === Math.min(p.maxReached, 5)
          const dot = isActive
            ? isCurrentHighest
              ? 'bg-emerald-400 ring-2 ring-emerald-400/40 scale-125'
              : 'bg-indigo-400'
            : 'bg-slate-700'
          return (
            <div key={phase.phase} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${dot}`} aria-hidden="true" />
              <span className={`text-[10px] text-center leading-tight ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                {phase.phase}
              </span>
            </div>
          )
        })}
      </div>

      <div className="w-full bg-slate-800 h-1.5 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700"
          style={{ width: `${Math.min(((p.maxReached + 1) / 6) * 100, 100)}%` }}
          role="progressbar"
          aria-valuenow={p.maxReached + 1}
          aria-valuemin={1}
          aria-valuemax={6}
          aria-label={`Pipeline progress: ${PHASE_ORDER[p.maxReached] || 'Unknown'}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {p.appTypes.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Application Type</p>
            <div className="flex flex-wrap gap-1.5">
              {p.appTypes.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded bg-cyan-900/30 text-cyan-300 border border-cyan-700/40">{t}</span>
              ))}
            </div>
          </div>
        )}

        {p.sponsors.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Sponsors</p>
            <div className="text-sm text-slate-200">
              {p.sponsors.slice(0, 3).join(', ')}
            </div>
          </div>
        )}

        {p.firstApprovalDate && (
          <div className="bg-slate-800/50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">First Approval</p>
            <p className="text-sm text-emerald-300 font-medium">{p.firstApprovalDate}</p>
          </div>
        )}

        {p.marketingStatus && (
          <div className="bg-slate-800/50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Marketing Status</p>
            <p className="text-sm text-slate-200">{p.marketingStatus}</p>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {p.approvedIndications.length > 0 && (
          <div className="bg-emerald-900/15 border border-emerald-700/30 rounded-lg px-3 py-2">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1.5 font-medium">
              Approved Indications ({p.approvedIndications.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {p.approvedIndications.slice(0, 8).map(ind => (
                <span key={ind} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-800/40">
                  {ind}
                </span>
              ))}
              {p.approvedIndications.length > 8 && (
                <span className="text-[10px] text-emerald-500">+{p.approvedIndications.length - 8} more</span>
              )}
            </div>
          </div>
        )}

        {p.investigationalIndications.length > 0 && (
          <div className="bg-indigo-900/15 border border-indigo-700/30 rounded-lg px-3 py-2">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1.5 font-medium">
              Investigational ({p.investigationalIndications.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {p.investigationalIndications.slice(0, 6).map(ind => (
                <span key={ind} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/30 text-indigo-300 border border-indigo-800/40">
                  {ind}
                </span>
              ))}
              {p.investigationalIndications.length > 6 && (
                <span className="text-[10px] text-indigo-500">+{p.investigationalIndications.length - 6} more</span>
              )}
            </div>
          </div>
        )}

        {p.shortageInfo && (
          <div className="bg-amber-900/15 border border-amber-700/30 rounded-lg px-3 py-2">
            <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-0.5 font-medium">Drug Shortage</p>
            <p className="text-xs text-amber-300">{p.shortageInfo}</p>
          </div>
        )}
      </div>
    </div>
  )
}