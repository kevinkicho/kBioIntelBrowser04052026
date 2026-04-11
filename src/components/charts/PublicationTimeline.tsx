'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { LiteratureResult } from '@/lib/types'

interface PublicationTimelineProps {
  results: LiteratureResult[]
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
        <p style={{ margin: 0 }}>Publications: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

export function PublicationTimeline({ results }: PublicationTimelineProps) {
  const currentYear = new Date().getFullYear()
  const cutoffYear = currentYear - 20

  const filtered = results.filter((r) => r.year > 0 && r.year >= cutoffYear)

  const countsByYear: Record<number, number> = {}
  for (const result of filtered) {
    countsByYear[result.year] = (countsByYear[result.year] ?? 0) + 1
  }

  const data: { year: number; count: number }[] = (() => {
    if (filtered.length === 0) return []
    const years = Object.keys(countsByYear).map(Number)
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)
    const result: { year: number; count: number }[] = []
    for (let y = minYear; y <= maxYear; y++) {
      result.push({ year: y, count: countsByYear[y] ?? 0 })
    }
    return result
  })()

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <p className="text-sm font-semibold text-slate-300 mb-3">Publications per Year</p>

      {results.length === 0 ? (
        <p className="text-slate-500 text-sm">No publication data loaded</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="year"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
