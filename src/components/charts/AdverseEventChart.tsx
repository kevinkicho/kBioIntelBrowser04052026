'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import type { AdverseEvent } from '@/lib/types'

interface AdverseEventChartProps {
  events: AdverseEvent[]
}

const COLORS = {
  Serious: '#ef4444',
  'Non-Serious': '#f59e0b',
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
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
        <p style={{ margin: 0 }}>{payload[0].name}</p>
        <p style={{ margin: 0 }}>Count: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

export function AdverseEventChart({ events }: AdverseEventChartProps) {
  const totalCount = events.reduce((sum, e) => sum + e.count, 0)
  const seriousCount = events.reduce((sum, e) => sum + (e.serious ? e.count : 0), 0)
  const nonSeriousCount = totalCount - seriousCount

  const data = [
    { name: 'Serious', value: seriousCount },
    { name: 'Non-Serious', value: nonSeriousCount },
  ]

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <p className="text-sm font-semibold text-slate-300 mb-3">Adverse Event Severity</p>

      {events.length === 0 ? (
        <p className="text-slate-500 text-sm">No adverse event data loaded</p>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          >
            <span className="text-2xl font-bold text-slate-100">{totalCount}</span>
            <span className="text-xs text-slate-500">total</span>
          </div>
        </div>
      )}
    </div>
  )
}
