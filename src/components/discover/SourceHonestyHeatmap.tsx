'use client'

import type { CandidateMolecule } from '@/lib/candidateRanker'
import type { SourceFetchStatus } from '@/lib/dataStatus'

interface Props {
  candidates: CandidateMolecule[]
  sourceStatuses?: SourceFetchStatus[]
  maxCandidates?: number
}

/**
 * Compact candidates × origin sources honesty matrix.
 */
export function SourceHonestyHeatmap({
  candidates,
  sourceStatuses = [],
  maxCandidates = 12,
}: Props) {
  const rows = candidates.slice(0, maxCandidates)
  const sourceKeys = Array.from(
    new Set([
      ...sourceStatuses.map((s) => s.source).filter(Boolean),
      ...rows.flatMap((c) => (c.sources ?? []).map((s) => String(s))),
    ]),
  ).slice(0, 10)

  if (rows.length === 0 || sourceKeys.length === 0) return null

  const statusBySource = new Map(sourceStatuses.map((s) => [s.source, s]))

  function cell(cand: CandidateMolecule, source: string): 'hit' | 'empty' | 'error' | 'miss' {
    const st = statusBySource.get(source)
    if (st?.status === 'error' || st?.status === 'timeout') return 'error'
    if (st?.status === 'empty' || st?.has_data === false) return 'empty'
    const has = (cand.sources ?? []).some(
      (s) =>
        String(s).toLowerCase() === source.toLowerCase() ||
        String(s).toLowerCase().includes(source.toLowerCase()),
    )
    if (has) return 'hit'
    return 'miss'
  }

  const color = {
    hit: 'bg-emerald-600/80',
    empty: 'bg-slate-700/80',
    error: 'bg-red-700/70',
    miss: 'bg-slate-800/50',
  }

  return (
    <div
      className="mb-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 p-3"
      data-testid="source-honesty-heatmap"
    >
      <p className="mb-2 text-[11px] font-semibold text-slate-300">
        Source honesty
        <span className="ml-2 font-normal text-slate-600">
          (candidate × origin — green hit · grey empty/miss · red error)
        </span>
      </p>
      <table className="min-w-full border-collapse text-[9px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-slate-900/90 px-1.5 py-1 text-left text-slate-500 font-medium">
              Candidate
            </th>
            {sourceKeys.map((s) => (
              <th
                key={s}
                className="px-1 py-1 text-slate-500 font-normal max-w-[4rem] truncate"
                title={s}
              >
                {s.length > 8 ? `${s.slice(0, 7)}…` : s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.name}>
              <td className="sticky left-0 bg-slate-900/90 px-1.5 py-0.5 text-slate-400 max-w-[7rem] truncate">
                {c.name}
              </td>
              {sourceKeys.map((s) => {
                const k = cell(c, s)
                return (
                  <td key={s} className="px-0.5 py-0.5">
                    <span
                      className={`inline-block h-3 w-full min-w-[0.75rem] rounded-sm ${color[k]}`}
                      title={`${c.name} · ${s}: ${k}`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
