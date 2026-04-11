'use client'

import { useMemo } from 'react'
import type { Patent, ClinicalTrial, DrugRecall, OrangeBookEntry, CompanyProduct } from '@/lib/types'

interface TimelineEvent {
  date: Date
  label: string
  detail: string
  type: 'patent' | 'trial' | 'approval' | 'recall' | 'product'
}

interface Props {
  patents: Patent[]
  trials: ClinicalTrial[]
  recalls: DrugRecall[]
  orangeBookEntries: OrangeBookEntry[]
  companies: CompanyProduct[]
}

const TYPE_CONFIG: Record<TimelineEvent['type'], { color: string; bg: string; icon: string }> = {
  patent:   { color: 'text-blue-400',    bg: 'bg-blue-500',    icon: '📄' },
  trial:    { color: 'text-amber-400',   bg: 'bg-amber-500',   icon: '🔬' },
  approval: { color: 'text-emerald-400', bg: 'bg-emerald-500', icon: '✅' },
  recall:   { color: 'text-red-400',     bg: 'bg-red-500',     icon: '⚠️' },
  product:  { color: 'text-indigo-400',  bg: 'bg-indigo-500',  icon: '💊' },
}

function parseDate(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function MoleculeTimeline({ patents, trials, recalls, orangeBookEntries }: Props) {
  const events = useMemo(() => {
    const evts: TimelineEvent[] = []

    for (const p of patents) {
      const d = parseDate(p.filingDate)
      if (d) evts.push({ date: d, label: `Patent Filed`, detail: `${p.patentNumber} — ${p.title?.slice(0, 60) || p.assignee}`, type: 'patent' })
    }
    for (const t of trials) {
      const d = parseDate(t.startDate)
      if (d) evts.push({ date: d, label: `${t.phase || 'Trial'}`, detail: `${t.nctId} — ${t.title?.slice(0, 60)}`, type: 'trial' })
    }
    for (const r of recalls) {
      const d = parseDate(r.reportDate)
      if (d) evts.push({ date: d, label: `Recall (${r.classification})`, detail: `${r.recallingFirm} — ${r.reason?.slice(0, 60)}`, type: 'recall' })
    }
    for (const o of orangeBookEntries) {
      const d = parseDate(o.approvalDate)
      if (d) evts.push({ date: d, label: 'FDA Approval', detail: `${o.sponsorName} — ${o.dosageForm} (${o.applicationNumber})`, type: 'approval' })
    }

    evts.sort((a, b) => a.date.getTime() - b.date.getTime())
    return evts
  }, [patents, trials, recalls, orangeBookEntries])

  if (events.length < 2) return null

  const minDate = events[0].date.getTime()
  const maxDate = events[events.length - 1].date.getTime()
  const range = maxDate - minDate || 1

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 col-span-full">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Molecule Timeline</h3>
      <p className="text-[10px] text-slate-600 mb-4">
        {events[0].date.getFullYear()} — {events[events.length - 1].date.getFullYear()} · {events.length} events
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <span key={type} className={`flex items-center gap-1 text-[10px] ${cfg.color}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.bg}`} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
      </div>

      {/* Timeline track */}
      <div className="relative">
        {/* Horizontal line */}
        <div className="absolute top-4 left-0 right-0 h-px bg-slate-600" />
        
        {/* Events */}
        <div className="relative flex" style={{ minHeight: '100px' }}>
          {events.map((evt, i) => {
            const pct = ((evt.date.getTime() - minDate) / range) * 100
            const cfg = TYPE_CONFIG[evt.type]
            // Alternate above/below to reduce overlap
            const isAbove = i % 2 === 0
            
            return (
              <div
                key={`${evt.type}-${i}`}
                className="absolute group"
                style={{ left: `${Math.min(pct, 97)}%` }}
              >
                {/* Connector line */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 w-px ${cfg.bg}`}
                  style={isAbove ? { bottom: '16px', height: '20px' } : { top: '16px', height: '20px' }}
                />
                
                {/* Dot */}
                <div className={`w-3 h-3 rounded-full ${cfg.bg} border-2 border-slate-900 relative z-10 cursor-pointer`} style={{ marginTop: '10px' }} />

                {/* Tooltip on hover */}
                <div
                  className={`absolute z-50 hidden group-hover:block w-56 p-2.5 bg-slate-800 border border-slate-600 rounded-lg shadow-xl text-xs ${
                    isAbove ? 'bottom-full mb-6' : 'top-full mt-6'
                  } left-1/2 -translate-x-1/2`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{cfg.icon}</span>
                    <span className={`font-semibold ${cfg.color}`}>{evt.label}</span>
                  </div>
                  <p className="text-slate-300 leading-snug">{evt.detail}</p>
                  <p className="text-slate-500 mt-1">{evt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Year markers */}
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[10px] text-slate-600">{events[0].date.getFullYear()}</span>
          <span className="text-[10px] text-slate-600">{events[events.length - 1].date.getFullYear()}</span>
        </div>
      </div>
    </div>
  )
}
