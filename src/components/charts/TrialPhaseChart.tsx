'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import type { ClinicalTrial } from '@/lib/types'

interface TrialPhaseChartProps {
  trials: ClinicalTrial[]
}

const PHASE_ORDER = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Other']

const PHASE_COLORS: Record<string, string> = {
  'Phase 1': '#818cf8',
  'Phase 2': '#6366f1',
  'Phase 3': '#4f46e5',
  'Phase 4': '#4338ca',
  Other: '#64748b',
}

function normalizePhase(phase: string): string {
  const normalized = phase.toLowerCase().replace(/\s+/g, '')
  if (normalized.includes('phase1') || normalized === 'phase1') return 'Phase 1'
  if (normalized.includes('phase2') || normalized === 'phase2') return 'Phase 2'
  if (normalized.includes('phase3') || normalized === 'phase3') return 'Phase 3'
  if (normalized.includes('phase4') || normalized === 'phase4') return 'Phase 4'
  return 'Other'
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          color: '#e2e8f0',
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: 13,
        }}
      >
        <p style={{ margin: 0 }}>{label}</p>
        <p style={{ margin: 0 }}>Count: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

export function TrialPhaseChart({ trials }: TrialPhaseChartProps) {
  const counts = PHASE_ORDER.reduce<Record<string, number>>((acc, phase) => {
    acc[phase] = 0
    return acc
  }, {})

  for (const trial of trials) {
    const phase = normalizePhase(trial.phase)
    counts[phase] = (counts[phase] ?? 0) + 1
  }

  const data = PHASE_ORDER.filter((phase) => counts[phase] > 0).map((phase) => ({
    phase,
    count: counts[phase],
  }))

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <p className="text-sm font-semibold text-slate-300 mb-3">Clinical Trial Phases</p>

      {trials.length === 0 ? (
        <p className="text-slate-500 text-sm">No clinical trial data loaded</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              type="number"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="phase"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count">
              {data.map((entry) => (
                <Cell key={entry.phase} fill={PHASE_COLORS[entry.phase]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
