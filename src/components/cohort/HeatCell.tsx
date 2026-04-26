'use client'

import type { MatrixCell } from '@/lib/cohort/types'

interface HeatCellProps {
  cell: MatrixCell
  /** Whether this cell is in a row that's still loading. */
  loading?: boolean
}

/**
 * Color a numeric cell red→amber→emerald based on heat (0..1). Categorical or
 * null cells stay slate. Loading cells show a thin animated bar.
 *
 * We render the background color via inline style so callers don't need a
 * tailwind safelist for every shade.
 */
export function HeatCell({ cell, loading }: HeatCellProps) {
  if (loading) {
    return (
      <td className="px-3 py-2 border-b border-slate-800 align-middle">
        <div className="h-2 w-full bg-slate-700 rounded animate-pulse" />
      </td>
    )
  }

  const isNumeric = typeof cell.value === 'number'
  const hasHeat = typeof cell.heat === 'number'

  let bgStyle: React.CSSProperties = {}
  let textColor = 'text-slate-300'

  if (cell.value === null) {
    bgStyle = {}
    textColor = 'text-slate-600'
  } else if (hasHeat) {
    // Heat 0 → red, 0.5 → amber, 1 → emerald
    const h = cell.heat as number
    const r = Math.round(255 * (1 - h * 0.6))
    const g = Math.round(140 + h * 90)
    const b = Math.round(80 + h * 40)
    // Translucent so the dark background tints through
    bgStyle = { backgroundColor: `rgba(${r}, ${g}, ${b}, ${0.18 + Math.abs(h - 0.5) * 0.22})` }
    textColor = 'text-slate-100'
  } else if (!isNumeric && cell.value !== null) {
    // Categorical: subtle slate fill
    bgStyle = { backgroundColor: 'rgba(99, 102, 241, 0.10)' }
    textColor = 'text-indigo-200'
  }

  return (
    <td
      className={`px-3 py-2 border-b border-slate-800 text-sm font-mono whitespace-nowrap ${textColor}`}
      style={bgStyle}
      title={cell.value === null ? 'No data' : String(cell.value)}
    >
      {cell.display}
    </td>
  )
}
