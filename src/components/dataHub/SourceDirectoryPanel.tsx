'use client'

/**
 * Source coverage directory for the current entity's Data Hub.
 * Compact multi-column grid — hide empty sources by default.
 */

import { useMemo, useState } from 'react'
import type { SourceDirectory } from '@/lib/dataHub'
import { emptyDataClass } from '@/lib/summaryEmpty'
import { HelperTip } from '@/components/ui/HelperTip'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export interface SourceDirectoryPanelProps {
  directory: SourceDirectory
  onOpenPanel?: (categoryId: string, panelId: string) => void
  className?: string
  testId?: string
}

export function SourceDirectoryPanel({
  directory,
  onOpenPanel,
  className = '',
  testId = 'source-directory',
}: SourceDirectoryPanelProps) {
  const [showEmpty, setShowEmpty] = useState(false)

  const rows = useMemo(() => {
    return directory.entries.filter((e) => showEmpty || e.factCount > 0)
  }, [directory.entries, showEmpty])

  const emptySources = directory.total - directory.withData

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-950/40 ${className}`}
      data-testid={testId}
      aria-label="Source directory"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-xs font-semibold text-slate-100">Source directory</h3>
          <HelperTip
            content="Free public sources that appear on this entity’s Data hub. Empty sources are hidden by default. Docs open upstream API documentation."
            label="About source directory"
            testId={`${testId}-help`}
          />
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] tabular-nums text-slate-400">
            {directory.withData}/{directory.total} with data
          </span>
        </div>
        {emptySources > 0 && (
          <button
            type="button"
            onClick={() => setShowEmpty((v) => !v)}
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
            data-testid={`${testId}-toggle-empty`}
          >
            {showEmpty ? 'Hide empty sources' : `Show ${emptySources} empty`}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-3 text-center text-[11px] text-slate-500">
          No source coverage yet — wait for categories to load.
        </p>
      ) : (
        <ul
          className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          data-testid={`${testId}-grid`}
        >
          {rows.map((e) => {
            const empty = e.factCount === 0
            const panelId = e.panelIds[0]
            const catId = e.categoryIds[0]
            return (
              <li
                key={e.id}
                data-testid={`${testId}-row-${e.id}`}
                data-empty={empty ? 'true' : 'false'}
                className={`flex min-w-0 flex-col gap-0.5 rounded-lg border border-slate-800/70 bg-slate-900/40 px-2 py-1.5 ${emptyDataClass(empty)}`}
              >
                <div className="flex min-w-0 items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium leading-tight text-slate-200" title={e.source}>
                      {e.source}
                    </p>
                    {e.api && (
                      <p className="truncate text-[9px] text-slate-600" title={e.api}>
                        {e.api}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] tabular-nums ${
                      empty
                        ? 'border-slate-700 text-slate-600'
                        : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
                    }`}
                  >
                    {e.factCount}
                  </span>
                </div>
                {e.sampleFacts.length > 0 && (
                  <p className="line-clamp-1 text-[9px] leading-tight text-slate-500" title={e.sampleFacts.join(' · ')}>
                    {e.sampleFacts.join(' · ')}
                  </p>
                )}
                <span className="mt-auto inline-flex flex-wrap gap-0.5 pt-0.5">
                  {panelId && catId && onOpenPanel && (
                    <button
                      type="button"
                      onClick={() => onOpenPanel(catId, panelId)}
                      className="rounded border border-slate-700 px-1 py-0.5 text-[9px] text-indigo-300 hover:border-indigo-600/40"
                    >
                      Panel
                    </button>
                  )}
                  {e.docs && (
                    <a
                      href={e.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onDeepLinkClick(e.source, e.docs, { label: 'docs' })}
                      className="rounded border border-slate-700 px-1 py-0.5 text-[9px] text-emerald-300/90 hover:border-emerald-700/40"
                    >
                      Docs ↗
                    </a>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
