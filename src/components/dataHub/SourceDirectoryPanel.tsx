'use client'

/**
 * Source coverage directory for the current entity's Data Hub.
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

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-950/40 ${className}`}
      data-testid={testId}
      aria-label="Source directory"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-xs font-semibold text-slate-100">Source directory</h3>
          <HelperTip
            content="Free public sources that appear on this entity’s Data hub. Filter to what has data for the current page session. Docs open upstream API documentation."
            label="About source directory"
            testId={`${testId}-help`}
          />
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] tabular-nums text-slate-400">
            {directory.withData}/{directory.total} with data
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowEmpty((v) => !v)}
          className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
          data-testid={`${testId}-toggle-empty`}
        >
          {showEmpty ? 'Hide empty sources' : 'Show empty sources'}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-4 text-center text-[11px] text-slate-500">
          No source coverage yet — wait for categories to load.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
          {rows.map((e) => {
            const empty = e.factCount === 0
            const panelId = e.panelIds[0]
            const catId = e.categoryIds[0]
            return (
              <li
                key={e.id}
                data-testid={`${testId}-row-${e.id}`}
                data-empty={empty ? 'true' : 'false'}
                className={`flex flex-wrap items-start justify-between gap-2 px-3 py-2 ${emptyDataClass(empty)}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-200">{e.source}</span>
                    {e.api && (
                      <span className="text-[9px] text-slate-500">{e.api}</span>
                    )}
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[9px] tabular-nums ${
                        empty
                          ? 'border-slate-700 text-slate-600'
                          : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
                      }`}
                    >
                      {e.factCount} fact{e.factCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  {e.sampleFacts.length > 0 && (
                    <p className="mt-0.5 text-[10px] text-slate-500 truncate">
                      {e.sampleFacts.join(' · ')}
                    </p>
                  )}
                </div>
                <span className="inline-flex flex-wrap gap-1">
                  {panelId && catId && onOpenPanel && (
                    <button
                      type="button"
                      onClick={() => onOpenPanel(catId, panelId)}
                      className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-indigo-300 hover:border-indigo-600/40"
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
                      className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-emerald-300/90 hover:border-emerald-700/40"
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
