'use client'

/**
 * Candidate × origin honesty matrix.
 * Multi-column green hits when gather tagged multiple free APIs (normalized keys).
 */

import { useMemo } from 'react'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import type { SourceFetchStatus } from '@/lib/dataStatus'
import {
  buildSourceHonestyMatrix,
  honestyCellLabel,
  type HonestyCellKind,
} from '@/lib/discovery/sourceHonesty'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { emptyDataClass } from '@/lib/summaryEmpty'

interface Props {
  candidates: CandidateMolecule[]
  sourceStatuses?: SourceFetchStatus[]
  maxCandidates?: number
  diseaseName?: string | null
}

const CELL_CLASS: Record<HonestyCellKind, string> = {
  hit: 'bg-emerald-500/85 ring-1 ring-emerald-400/40',
  miss: 'bg-slate-800/90 ring-1 ring-slate-700/40',
  source_empty: 'bg-slate-700/40 ring-1 ring-slate-600/30',
  source_error: 'bg-red-700/70 ring-1 ring-red-500/40',
  source_disabled: 'bg-slate-700/50 ring-1 ring-slate-600/20',
}

const UPSTREAM_DOT: Record<string, string> = {
  loaded: 'bg-emerald-400',
  empty: 'bg-slate-500',
  error: 'bg-red-400',
  timeout: 'bg-red-400',
  disabled: 'bg-slate-600',
}

function scrollToAnchor(id: string) {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('ring-2', 'ring-indigo-500/60')
  window.setTimeout(() => {
    el.classList.remove('ring-2', 'ring-indigo-500/60')
  }, 1600)
}

/**
 * Compact candidates × origin sources honesty matrix.
 */
export function SourceHonestyHeatmap({
  candidates,
  sourceStatuses = [],
  maxCandidates = 15,
  diseaseName = null,
}: Props) {
  const matrix = useMemo(
    () =>
      buildSourceHonestyMatrix({
        candidates,
        sourceStatuses,
        maxCandidates,
        diseaseName,
      }),
    [candidates, sourceStatuses, maxCandidates, diseaseName],
  )

  if (matrix.rows.length === 0 || matrix.columns.length === 0) return null

  return (
    <div
      className="mb-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 p-3"
      data-testid="source-honesty-heatmap"
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-200">
            Source honesty
            <span className="ml-2 font-normal text-slate-500">
              which free APIs contributed each shortlist row
            </span>
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
            Each column is one public gather family. Green = this molecule came from that source.
            Click a name to jump to its card; click a column header to open the source registry.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[9px] text-slate-500">
          <span
            className="rounded-full border border-emerald-800/40 bg-emerald-950/30 px-2 py-0.5 text-emerald-200 tabular-nums"
            data-testid="source-honesty-hit-summary"
          >
            {matrix.originsWithHits} origin{matrix.originsWithHits !== 1 ? 's' : ''} with hits ·{' '}
            {matrix.totalHits} cell hits
          </span>
        </div>
      </div>

      {/* Legend */}
      <div
        className="mb-2 flex flex-wrap gap-3 text-[9px] text-slate-500"
        data-testid="source-honesty-legend"
      >
        <span className="inline-flex items-center gap-1">
          <span className={`h-2.5 w-4 rounded-sm ${CELL_CLASS.hit}`} /> Hit
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={`h-2.5 w-4 rounded-sm ${CELL_CLASS.miss}`} /> Miss
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={`h-2.5 w-4 rounded-sm ${CELL_CLASS.source_empty}`} /> Source empty
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={`h-2.5 w-4 rounded-sm ${CELL_CLASS.source_error}`} /> Source error
        </span>
      </div>

      <table className="min-w-full border-collapse text-[9px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-slate-900/95 px-1.5 py-1 text-left text-slate-500 font-medium">
              # · Candidate
            </th>
            {matrix.columns.map((col) => {
              const rate =
                matrix.rows.length > 0
                  ? Math.round((col.hitCount / matrix.rows.length) * 100)
                  : 0
              const tip = [
                col.label,
                col.upstreamStatus ? `Upstream: ${col.upstreamStatus}` : 'No status row',
                col.upstreamError ? col.upstreamError : '',
                `Hits: ${col.hitCount}/${matrix.rows.length} (${rate}%)`,
                col.rawLabels.length > 1 ? `Labels: ${col.rawLabels.join(', ')}` : '',
                col.href ? 'Click to open source registry' : '',
              ]
                .filter(Boolean)
                .join('\n')
              const headerBody = (
                <span className="flex flex-col items-center gap-0.5 max-w-[4.5rem]">
                  <span className="flex items-center gap-0.5">
                    {col.upstreamStatus && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          UPSTREAM_DOT[col.upstreamStatus] || 'bg-slate-500'
                        }`}
                        aria-hidden
                      />
                    )}
                    <span className="truncate font-medium text-slate-400">
                      {col.label.length > 10 ? `${col.label.slice(0, 9)}…` : col.label}
                    </span>
                  </span>
                  <span
                    className={`tabular-nums ${emptyDataClass(col.hitCount === 0)} ${
                      col.hitCount > 0 ? 'text-emerald-400/90' : 'text-slate-600'
                    }`}
                  >
                    {col.hitCount}/{matrix.rows.length}
                  </span>
                </span>
              )
              return (
                <th key={col.id} className="px-1 py-1 font-normal">
                  <StyledTooltip content={tip}>
                    {col.href ? (
                      <a
                        href={col.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:text-indigo-300"
                        data-testid={`source-honesty-col-${col.id}`}
                        onClick={() =>
                          onDeepLinkClick(col.label, col.href, {
                            label: col.label,
                            panelId: 'discover-source-honesty',
                          })
                        }
                      >
                        {headerBody}
                      </a>
                    ) : (
                      <span
                        className="block"
                        data-testid={`source-honesty-col-${col.id}`}
                      >
                        {headerBody}
                      </span>
                    )}
                  </StyledTooltip>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.anchorId} className="hover:bg-slate-800/30">
              <td className="sticky left-0 z-10 bg-slate-900/95 px-1.5 py-0.5 max-w-[8rem]">
                <button
                  type="button"
                  className="w-full truncate text-left text-slate-300 hover:text-indigo-300"
                  data-testid={`source-honesty-row-${row.rank}`}
                  onClick={() => scrollToAnchor(row.anchorId)}
                  title={`Jump to card #${row.rank} ${row.name}`}
                >
                  <span className="font-mono text-slate-600">#{row.rank}</span>{' '}
                  {row.name}
                </button>
              </td>
              {matrix.columns.map((col) => {
                const kind = row.cells[col.id] ?? 'miss'
                const tip = `${row.name} · ${col.label}: ${honestyCellLabel(kind)}`
                return (
                  <td key={col.id} className="px-0.5 py-0.5">
                    <StyledTooltip content={tip} className="w-full">
                      <button
                        type="button"
                        className="block w-full min-w-[1rem] rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        data-testid={`source-honesty-cell-${row.rank}-${col.id}`}
                        data-kind={kind}
                        aria-label={tip}
                        onClick={() => scrollToAnchor(row.anchorId)}
                      >
                        <span
                          className={`inline-block h-3.5 w-full rounded-sm ${CELL_CLASS[kind]}`}
                        />
                      </button>
                    </StyledTooltip>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-[9px] leading-relaxed text-slate-600">{matrix.notes[0]}</p>
      {matrix.notes[1] && (
        <p className="text-[9px] leading-relaxed text-slate-600">{matrix.notes[1]}</p>
      )}
    </div>
  )
}
