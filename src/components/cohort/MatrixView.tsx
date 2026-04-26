'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { HeatCell } from './HeatCell'
import { sortByVariance } from '@/lib/cohort/buildMatrix'
import type { MatrixRow, Molecule } from '@/lib/cohort/types'
import type { CategoryLoadState } from '@/lib/fetchCategory'
import type { CategoryId } from '@/lib/categoryConfig'

interface MatrixViewProps {
  molecules: Molecule[]
  rows: MatrixRow[]
  /** Per-molecule per-category load state, used to render loading cells. */
  statusByCid: Record<number, Partial<Record<CategoryId, CategoryLoadState>>>
  sortBy: 'variance' | 'category'
  onRemoveMolecule?: (cid: number) => void
}

/**
 * The main heatmap matrix. Rows are attributes, columns are molecules.
 * We render only after the cohort has at least one molecule; the calling
 * client is responsible for the empty state.
 */
export function MatrixView({
  molecules,
  rows,
  statusByCid,
  sortBy,
  onRemoveMolecule,
}: MatrixViewProps) {
  const orderedRows = useMemo(() => {
    if (sortBy === 'variance') return sortByVariance(rows)
    // Default: keep registry order (groups stay together by category)
    return rows
  }, [rows, sortBy])

  return (
    <div className="overflow-x-auto border border-slate-700 rounded-xl bg-slate-900/40">
      <table className="min-w-full text-left">
        <thead>
          <tr className="bg-slate-800/60">
            <th className="px-3 py-3 sticky left-0 bg-slate-800/90 backdrop-blur z-10 text-xs uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700 min-w-[14rem]">
              Attribute
            </th>
            {molecules.map((m) => (
              <th
                key={m.cid}
                className="px-3 py-3 border-b border-slate-700 text-xs text-slate-300 font-semibold whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/molecule/${m.cid}`}
                    className="hover:text-indigo-300 transition-colors truncate max-w-[10rem]"
                    title={`${m.name} (CID ${m.cid})`}
                  >
                    {m.name}
                  </Link>
                  <span className="text-[10px] text-slate-500">CID {m.cid}</span>
                  {onRemoveMolecule && (
                    <button
                      type="button"
                      onClick={() => onRemoveMolecule(m.cid)}
                      className="text-slate-500 hover:text-red-400 transition-colors text-xs"
                      aria-label={`Remove ${m.name} from cohort`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orderedRows.map((row) => (
            <tr key={row.attribute.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-3 py-2 sticky left-0 bg-slate-900/90 backdrop-blur z-10 text-sm text-slate-300 border-b border-slate-800 min-w-[14rem]">
                <div className="flex items-center justify-between gap-2">
                  <span title={row.attribute.label}>{row.attribute.label}</span>
                  {sortBy === 'variance' && row.variance > 0 && (
                    <span className="text-[10px] text-slate-500" title="Row variance (heat space)">
                      σ²={row.variance.toFixed(2)}
                    </span>
                  )}
                </div>
              </td>
              {molecules.map((m, i) => {
                const status = statusByCid[m.cid]?.[row.attribute.category]
                const cellLoading =
                  row.cells[i].value === null && (status === 'loading' || status === undefined || status === 'idle')
                return (
                  <HeatCell
                    key={`${row.attribute.id}-${m.cid}`}
                    cell={row.cells[i]}
                    loading={cellLoading}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
