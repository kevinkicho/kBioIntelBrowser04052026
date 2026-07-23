'use client'

/**
 * Factual multi-source data hub table.
 * Fact | Value | Source | Open — no narrative AI claims.
 */

import { useMemo, useState } from 'react'
import type { DataHubLedger, DataHubRow } from '@/lib/dataHub'
import { isDataHubValueEmpty } from '@/lib/dataHub'
import { emptyDataClass } from '@/lib/summaryEmpty'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

export interface DataHubLedgerProps {
  ledger: DataHubLedger
  onOpenPanel?: (categoryId: string, panelId: string) => void
  className?: string
  testId?: string
  /** When true, hide rows whose value is empty (default true) */
  hideEmpty?: boolean
  /** Compact header for decision mode */
  density?: 'full' | 'compact'
}

function stableHref(url?: string): string | null {
  const u = (url || '').trim()
  if (!/^https?:\/\//i.test(u)) return null
  if (isBrokenSourceShellUrl(u)) return null
  return u
}

function RowActions({
  row,
  onOpenPanel,
}: {
  row: DataHubRow
  onOpenPanel?: (categoryId: string, panelId: string) => void
}) {
  const href = stableHref(row.sourceUrl)
  const canPanel = Boolean(row.panelId && row.categoryId && onOpenPanel)
  if (!href && !canPanel) {
    return <span className="text-[10px] text-slate-600">—</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {canPanel && (
        <button
          type="button"
          onClick={() => onOpenPanel!(row.categoryId!, row.panelId!)}
          className="rounded border border-slate-700 bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300 hover:border-indigo-600/50 hover:text-indigo-200"
          data-testid={`data-hub-open-${row.id}`}
        >
          Panel
        </button>
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            onDeepLinkClick(row.source, href, {
              panelId: row.panelId,
              label: row.fact,
            })
          }
          className="rounded border border-slate-700 bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300/90 hover:border-emerald-700/40 hover:text-emerald-200"
          data-testid={`data-hub-source-${row.id}`}
        >
          Source ↗
        </a>
      )}
    </span>
  )
}

export function DataHubLedgerView({
  ledger,
  onOpenPanel,
  className = '',
  testId = 'data-hub-ledger',
  hideEmpty: hideEmptyProp = true,
  density = 'full',
}: DataHubLedgerProps) {
  const [hideEmpty, setHideEmpty] = useState(hideEmptyProp)
  const byId = useMemo(() => {
    const m = new Map<string, DataHubRow>()
    for (const r of ledger.rows) m.set(r.id, r)
    return m
  }, [ledger.rows])

  const visibleSections = useMemo(() => {
    return ledger.sections
      .map((sec) => {
        const rows = sec.rowIds
          .map((id) => byId.get(id))
          .filter((r): r is DataHubRow => Boolean(r))
          .filter((r) => (hideEmpty ? !isDataHubValueEmpty(r.value) : true))
        return { sec, rows }
      })
      .filter(({ rows }) => rows.length > 0)
  }, [ledger.sections, byId, hideEmpty])

  const filledCount = ledger.rows.filter((r) => !isDataHubValueEmpty(r.value)).length

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/50 ${className}`}
      data-testid={testId}
      data-empty={ledger.empty ? 'true' : 'false'}
      data-source-count={ledger.sourceCount}
      aria-label="Data hub"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-slate-100">Data hub</h2>
            <HelperTip
              content={[
                'Multi-source factual ledger for this molecule.',
                'Each row is a value retrieved from a free public API with its source name.',
                'Open Panel for the siloed full table; Source opens the primary registry when a deep link exists.',
                'Not model-generated. Not for clinical or regulatory decisions.',
                ...(ledger.notes || []),
              ].join('\n\n')}
              label="About data hub"
              testId={`${testId}-help`}
            />
          </div>
          {density === 'full' && (
            <p className="mt-0.5 text-[10px] text-slate-500">
              Accurate public-record facts · per-source provenance · verify upstream before use
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold tabular-nums ${
              ledger.empty
                ? 'border-slate-700 text-slate-500'
                : 'border-indigo-800/50 bg-indigo-950/40 text-indigo-200'
            }`}
            data-testid={`${testId}-counts`}
          >
            {filledCount} facts · {ledger.sourceCount} sources
          </span>
          <button
            type="button"
            onClick={() => setHideEmpty((v) => !v)}
            className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
              hideEmpty
                ? 'border-indigo-700/50 bg-indigo-950/40 text-indigo-200'
                : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            data-testid={`${testId}-toggle-empty`}
          >
            {hideEmpty ? 'Show empty' : 'Hide empty'}
          </button>
        </div>
      </div>

      {visibleSections.length === 0 ? (
        <div className="px-3 py-6 text-center text-[11px] text-slate-500 sm:px-4">
          No multi-source facts loaded yet. Categories still hydrating — identity rows appear first.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          {visibleSections.map(({ sec, rows }) => (
            <div key={sec.id} data-testid={`${testId}-section-${sec.id}`} className="px-3 py-2 sm:px-4">
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {sec.title}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse text-left">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-wide text-slate-600">
                      <th className="pb-1 pr-2 font-semibold">Fact</th>
                      <th className="pb-1 pr-2 font-semibold">Value</th>
                      <th className="pb-1 pr-2 font-semibold">Source</th>
                      <th className="pb-1 font-semibold">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const empty = isDataHubValueEmpty(r.value)
                      return (
                        <tr
                          key={r.id}
                          data-testid={`${testId}-row-${r.id}`}
                          data-empty={empty ? 'true' : 'false'}
                          className={`border-t border-slate-800/40 align-top ${emptyDataClass(empty)}`}
                        >
                          <td className="py-1 pr-2 text-[11px] font-medium text-slate-300">
                            {r.fact}
                            {r.detail && (
                              <StyledTooltip content={r.detail}>
                                <span className="ml-1 cursor-help text-[9px] text-slate-600">ⓘ</span>
                              </StyledTooltip>
                            )}
                          </td>
                          <td className="py-1 pr-2 text-[11px] text-slate-100">
                            <span className="break-words">{r.value}</span>
                          </td>
                          <td className="py-1 pr-2 text-[10px] text-slate-400">{r.source}</td>
                          <td className="py-1">
                            <RowActions row={r} onOpenPanel={onOpenPanel} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
