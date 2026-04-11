'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { ChemblActivity } from '@/lib/types'

interface BioactivityChartProps {
  activities: ChemblActivity[]
}

function truncateName(name: string): string {
  return name.length > 20 ? name.slice(0, 18) + '...' : name
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

export function BioactivityChart({ activities }: BioactivityChartProps) {
  const countMap: Record<string, number> = {}
  for (const activity of activities) {
    countMap[activity.targetName] = (countMap[activity.targetName] ?? 0) + 1
  }

  const data = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([targetName, count]) => ({
      target: truncateName(targetName),
      count,
    }))

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <p className="text-sm font-semibold text-slate-300 mb-3">Top Targets by Activity Count</p>

      {activities.length === 0 ? (
        <p className="text-slate-500 text-sm">No bioactivity data loaded</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="target"
              tick={{ fill: '#94a3b8', fontSize: 11, angle: -30, textAnchor: 'end' }}
              interval={0}
              height={60}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
