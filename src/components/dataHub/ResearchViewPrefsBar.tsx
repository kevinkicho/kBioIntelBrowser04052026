'use client'

/**
 * Pin research tables / hub domains; save solo-local presentation prefs.
 */

import {
  HUB_DOMAIN_LABELS,
  HUB_DOMAIN_ORDER,
  RESEARCH_TABLE_DOMAINS,
  RESEARCH_TABLE_LABELS,
  toggleListItem,
  type PreferredProfileView,
  type ResearchTableDomain,
} from '@/lib/researchViewPrefs'
import type { DataHubDomain } from '@/lib/dataHub'
import { useResearchViewPrefs } from '@/hooks/useResearchViewPrefs'
import { HelperTip } from '@/components/ui/HelperTip'

export interface ResearchViewPrefsBarProps {
  /** Which chip groups to show */
  mode?: 'research' | 'hub' | 'both'
  className?: string
  testId?: string
  /** Compact: fewer labels */
  compact?: boolean
}

export function ResearchViewPrefsBar({
  mode = 'both',
  className = '',
  testId = 'research-view-prefs',
  compact = false,
}: ResearchViewPrefsBarProps) {
  const { prefs, patch, reset, hydrated } = useResearchViewPrefs()

  if (!hydrated) {
    return (
      <div
        className={`h-8 animate-pulse rounded-lg bg-slate-900/40 ${className}`}
        data-testid={`${testId}-skeleton`}
      />
    )
  }

  const showResearch = mode === 'research' || mode === 'both'
  const showHub = mode === 'hub' || mode === 'both'

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 ${className}`}
      data-testid={testId}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Saved research view
        </span>
        <HelperTip
          content={[
            'Pins which research tables and data-hub domains you see.',
            'Stored only in this browser (localStorage). Does not change Discover ranks or invent data.',
            'Empty selection is not allowed — at least one domain stays on.',
          ].join('\n\n')}
          label="About saved research view"
          testId={`${testId}-help`}
        />
        <button
          type="button"
          onClick={() => reset()}
          className="ml-auto text-[10px] text-slate-500 hover:text-slate-300"
          data-testid={`${testId}-reset`}
        >
          Reset defaults
        </button>
      </div>

      {showResearch && (
        <div className="mb-2">
          {!compact && (
            <p className="mb-1 text-[9px] text-slate-600">Research tables</p>
          )}
          <div className="flex flex-wrap gap-1" role="group" aria-label="Research tables">
            {RESEARCH_TABLE_DOMAINS.map((d) => {
              const on = prefs.researchTables.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    patch({
                      researchTables: toggleListItem(
                        prefs.researchTables,
                        d,
                        RESEARCH_TABLE_DOMAINS,
                      ) as ResearchTableDomain[],
                    })
                  }
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    on
                      ? 'border-sky-700/50 bg-sky-950/40 text-sky-200'
                      : 'border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                  data-testid={`${testId}-table-${d}`}
                >
                  {RESEARCH_TABLE_LABELS[d]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {showHub && (
        <div className="mb-2">
          {!compact && (
            <p className="mb-1 text-[9px] text-slate-600">Data hub domains</p>
          )}
          <div className="flex flex-wrap gap-1" role="group" aria-label="Hub domains">
            {HUB_DOMAIN_ORDER.map((d) => {
              const on = prefs.hubDomains.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    patch({
                      hubDomains: toggleListItem(
                        prefs.hubDomains,
                        d,
                        HUB_DOMAIN_ORDER,
                      ) as DataHubDomain[],
                    })
                  }
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    on
                      ? 'border-indigo-700/50 bg-indigo-950/40 text-indigo-200'
                      : 'border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                  data-testid={`${testId}-hub-${d}`}
                >
                  {HUB_DOMAIN_LABELS[d]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
          <input
            type="checkbox"
            checked={prefs.hideEmpty}
            onChange={(e) => patch({ hideEmpty: e.target.checked })}
            className="rounded border-slate-600 bg-slate-900"
            data-testid={`${testId}-hide-empty`}
          />
          Hide empty facts
        </label>

        <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
          Default view
          <select
            value={prefs.preferredProfileView}
            onChange={(e) =>
              patch({
                preferredProfileView: e.target.value as PreferredProfileView,
              })
            }
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-200"
            data-testid={`${testId}-default-view`}
          >
            <option value="research">Research</option>
            <option value="panels">Panels</option>
          </select>
        </label>

        <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
          Rows / table
          <select
            value={prefs.tableRowLimit}
            onChange={(e) =>
              patch({ tableRowLimit: parseInt(e.target.value, 10) || 12 })
            }
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-200"
            data-testid={`${testId}-row-limit`}
          >
            {[8, 12, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
