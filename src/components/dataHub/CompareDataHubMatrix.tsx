'use client'

/**
 * Side-by-side multi-CID data hub table for /compare.
 */

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { CompareHubMatrix } from '@/lib/dataHub'
import { compareHubMatrixFilename, compareHubMatrixToDelimited } from '@/lib/dataHub'
import { downloadFile } from '@/lib/exportData'
import { emptyDataClass } from '@/lib/summaryEmpty'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { HelperTip } from '@/components/ui/HelperTip'
import { ResearchViewPrefsBar } from '@/components/dataHub/ResearchViewPrefsBar'
import { useResearchViewPrefs } from '@/hooks/useResearchViewPrefs'
import { isHubDomainEnabled } from '@/lib/researchViewPrefs'

export interface CompareDataHubMatrixProps {
  matrix: CompareHubMatrix
  className?: string
  testId?: string
}

function stableHref(url?: string): string | null {
  const u = (url || '').trim()
  if (!/^https?:\/\//i.test(u)) return null
  if (isBrokenSourceShellUrl(u)) return null
  return u
}

export function CompareDataHubMatrix({
  matrix,
  className = '',
  testId = 'compare-data-hub',
}: CompareDataHubMatrixProps) {
  const { prefs, patch, hydrated } = useResearchViewPrefs()
  const [hideEmpty, setHideEmpty] = useState(true)

  useEffect(() => {
    if (hydrated) setHideEmpty(prefs.hideEmpty)
  }, [hydrated, prefs.hideEmpty])

  const filteredRows = useMemo(() => {
    return matrix.rows.filter((r) => isHubDomainEnabled(prefs, r.domain))
  }, [matrix.rows, prefs])

  const sections = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, { title: string; rows: typeof matrix.rows }>()
    for (const r of filteredRows) {
      if (hideEmpty && r.cells.every((c) => c.empty)) continue
      if (!map.has(r.sectionId)) {
        order.push(r.sectionId)
        map.set(r.sectionId, { title: r.sectionTitle, rows: [] })
      }
      map.get(r.sectionId)!.rows.push(r)
    }
    return order.map((id) => ({ id, ...map.get(id)! }))
  }, [filteredRows, hideEmpty])

  const exportMatrix = (format: 'csv' | 'tsv') => {
    // Export respects current domain pins + hideEmpty
    const exportMatrixShape: CompareHubMatrix = {
      ...matrix,
      rows: filteredRows,
      filledFactCount: filteredRows.filter((r) => r.cells.some((c) => !c.empty)).length,
    }
    const body = compareHubMatrixToDelimited(exportMatrixShape, format, {
      includeEmpty: !hideEmpty,
    })
    const mime =
      format === 'tsv'
        ? 'text/tab-separated-values;charset=utf-8'
        : 'text/csv;charset=utf-8'
    downloadFile(body, compareHubMatrixFilename(matrix, format), mime)
  }

  const toggleHideEmpty = () => {
    const next = !hideEmpty
    setHideEmpty(next)
    patch({ hideEmpty: next })
  }

  if (matrix.columns.length < 2) {
    return (
      <div
        className={`rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-[11px] text-slate-500 ${className}`}
        data-testid={testId}
      >
        Select at least two molecules to compare of-record public facts.
      </div>
    )
  }

  const n = matrix.columns.length

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/50 ${className}`}
      data-testid={testId}
      aria-label="Compare data hub"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-slate-100">
              Side-by-side data hub
            </h2>
            <HelperTip
              content={[
                'Same fact rows across molecules for research comparison.',
                'Values are free public API samples loaded for this compare page.',
                'Domain pins match Data hub saved research view (solo localStorage).',
                'Empty cells are not evidence of absence. Not clinical decision support.',
                ...(matrix.notes || []),
              ].join('\n\n')}
              label="About compare data hub"
            />
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {filteredRows.filter((r) => r.cells.some((c) => !c.empty)).length} facts
            {filteredRows.length < matrix.rows.length
              ? ` (of ${matrix.rows.length} total)`
              : ''}{' '}
            · {n} molecules · domain pins applied
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportMatrix('csv')}
            className="rounded-md border border-emerald-800/40 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
            data-testid={`${testId}-export-csv`}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportMatrix('tsv')}
            className="rounded-md border border-emerald-800/40 px-2 py-0.5 text-[10px] font-medium text-emerald-300/90"
            data-testid={`${testId}-export-tsv`}
          >
            Export TSV
          </button>
          <button
            type="button"
            onClick={toggleHideEmpty}
            className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${
              hideEmpty
                ? 'border-indigo-700/50 bg-indigo-950/40 text-indigo-200'
                : 'border-slate-700 text-slate-400'
            }`}
            data-testid={`${testId}-toggle-empty`}
          >
            {hideEmpty ? 'Show empty' : 'Hide empty'}
          </button>
        </div>
      </div>

      <div className="border-b border-slate-800/80 px-3 py-2 sm:px-4">
        <ResearchViewPrefsBar mode="hub" compact testId={`${testId}-prefs`} />
      </div>

      {/* Column headers */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-800 text-[9px] uppercase tracking-wide text-slate-600">
              <th className="sticky left-0 z-10 bg-slate-900/95 px-3 py-2 font-semibold">
                Fact
              </th>
              {matrix.columns.map((c) => (
                <th key={c.subjectId} className="px-3 py-2 font-semibold min-w-[8rem]">
                  <Link
                    href={`/molecule/${encodeURIComponent(c.subjectId)}`}
                    className="text-indigo-300 hover:text-indigo-200 normal-case text-[11px] font-semibold"
                  >
                    {c.subjectLabel}
                  </Link>
                  <div className="mt-0.5 normal-case font-normal text-slate-600">
                    CID {c.subjectId} · {c.sourceCount} src
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((sec) => (
              <Fragment key={sec.id}>
                <tr className="bg-slate-950/60">
                  <td
                    colSpan={n + 1}
                    className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {sec.title}
                  </td>
                </tr>
                {sec.rows.map((r) => (
                  <tr
                    key={r.factId}
                    data-testid={`${testId}-row-${r.factId}`}
                    className="border-t border-slate-800/40"
                  >
                    <td className="sticky left-0 z-10 bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-slate-300">
                      {r.fact}
                      <div className="text-[9px] font-normal text-slate-600">
                        {r.sourceHint}
                      </div>
                    </td>
                    {r.cells.map((cell, i) => {
                      const link = stableHref(cell.sourceUrl)
                      return (
                        <td
                          key={i}
                          className={`px-3 py-1.5 text-[11px] text-slate-100 align-top ${emptyDataClass(cell.empty)}`}
                          data-empty={cell.empty ? 'true' : 'false'}
                        >
                          <span className="break-words">{cell.value}</span>
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                onDeepLinkClick(cell.source || 'source', link, {
                                  label: r.fact,
                                })
                              }
                              className="ml-1 text-[9px] text-emerald-400 hover:underline"
                            >
                              ↗
                            </a>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {sections.length === 0 && (
        <p className="px-4 py-6 text-center text-[11px] text-slate-500">
          No non-empty facts to compare yet.
        </p>
      )}
    </section>
  )
}
