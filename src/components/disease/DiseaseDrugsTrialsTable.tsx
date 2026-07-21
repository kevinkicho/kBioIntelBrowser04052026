'use client'

import { useMemo, useState } from 'react'
import type { ClinicalTrial } from '@/lib/types'
import type { DrugInterventionGroup } from '@/lib/api/clinicaltrials'
import { DataPoint } from '@/components/ui/DataPoint'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { emptyDataClass } from '@/lib/summaryEmpty'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

const CT_SOURCE = 'clinical-trials'
const CT_API = 'https://clinicaltrials.gov/api/v2/studies'

function trialUrl(nctId: string): string {
  return nctId ? `https://clinicaltrials.gov/study/${nctId}` : 'https://clinicaltrials.gov/'
}

function statusClass(status: string): string {
  if (status === 'RECRUITING') {
    return 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50'
  }
  if (status === 'COMPLETED') {
    return 'bg-slate-700/60 text-slate-400 border-slate-600/50'
  }
  return 'bg-slate-700/40 text-slate-500 border-slate-600/50'
}

interface Props {
  drugs: DrugInterventionGroup[]
  diseaseName: string
  fetchedAt?: string | null
}

/**
 * Collapsible drug → nested clinical trials table.
 * Starts collapsed; API provenance on every drug and trial row.
 */
export function DiseaseDrugsTrialsTable({ drugs, diseaseName, fetchedAt }: Props) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set())

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<DrugInterventionGroup>((d) => d.trialCount, {
        high: 'Most trials',
        low: 'Fewest trials',
        idPrefix: 'count',
      }),
      ...alphaSortOptions<DrugInterventionGroup>((d) => d.name),
      ...alphaSortOptions<DrugInterventionGroup>((d) => d.type).map((o) => ({
        ...o,
        id: `type-${o.id}`,
        label: o.id.includes('asc') ? 'Type A–Z' : 'Type Z–A',
      })),
    ],
    [],
  )

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function expandAll() {
    setOpenKeys(new Set(drugs.map((d) => d.name.toUpperCase())))
  }

  function collapseAll() {
    setOpenKeys(new Set())
  }

  if (drugs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 opacity-30" data-empty="true">
        <p className="text-sm text-slate-500">No drug interventions found in clinical trials.</p>
      </div>
    )
  }

  return (
    <section className="mb-8" data-testid="disease-drugs-trials">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 mb-1">Drugs in Clinical Trials</h2>
          <p className="text-sm text-slate-400">
            {drugs.length} drug{drugs.length !== 1 ? 's' : ''} being tested for {diseaseName}. Expand a
            row for its trials.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <button
            type="button"
            onClick={expandAll}
            className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:text-slate-200"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:text-slate-200"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3">
        <FilterablePaginatedList
          items={drugs}
          getSearchText={(d) =>
            [
              d.name,
              d.type,
              ...d.trials.map((t) => `${t.nctId} ${t.title} ${t.phase} ${t.status} ${t.sponsor}`),
            ].join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="count-desc"
          filterPlaceholder="Filter drugs or trial titles…"
          getKey={(d) => d.name.toUpperCase()}
          pageSize={25}
          className="space-y-0"
          csvExport={{
            filename: `drugs-trials-${diseaseName.replace(/\s+/g, '-').slice(0, 40)}.csv`,
            columns: [
              { header: 'Drug', get: (d) => d.name },
              { header: 'Type', get: (d) => d.type },
              { header: 'TrialCount', get: (d) => d.trialCount },
              {
                header: 'NCT_IDs',
                get: (d) => d.trials.map((t) => t.nctId).join('; '),
              },
            ],
          }}
          renderItem={(drug) => {
            const key = drug.name.toUpperCase()
            const open = openKeys.has(key)
            return (
              <DataPoint
                sourceKey={CT_SOURCE}
                label={drug.name}
                fetchedAt={fetchedAt}
                endpointOverride={`${CT_API}?query.cond=…`}
                recordUrl={`https://clinicaltrials.gov/search?term=${encodeURIComponent(drug.name)}`}
                className="border-b border-slate-800/80 last:border-0"
              >
                <div className="w-full min-w-0">
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)_minmax(4.5rem,0.5fr)_minmax(3.5rem,0.4fr)_2.5rem] items-center gap-x-2 px-2 py-2 text-left hover:bg-slate-800/50 rounded-lg transition-colors"
                    aria-expanded={open}
                    data-testid={`drug-row-${key}`}
                  >
                    <span
                      className={`text-slate-500 text-xs transition-transform ${open ? 'rotate-90' : ''}`}
                      aria-hidden
                    >
                      ▸
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-amber-200 truncate">
                        {drug.name}
                      </span>
                      <span className="block text-[10px] text-slate-600 truncate">
                        ClinicalTrials.gov intervention · click to {open ? 'collapse' : 'expand'}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-500 truncate uppercase tracking-wide">
                      {drug.type || 'DRUG'}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-right text-amber-300/90">
                      {drug.trialCount} trial{drug.trialCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-slate-600 text-right">{open ? '▾' : '▸'}</span>
                  </button>

                  {open && (
                    <div
                      className="ml-5 mb-2 mt-0.5 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50"
                      data-testid={`drug-trials-${key}`}
                    >
                      <div className="grid grid-cols-[minmax(5.5rem,0.55fr)_minmax(0,1.4fr)_minmax(4rem,0.45fr)_minmax(5.5rem,0.55fr)_minmax(0,0.85fr)_minmax(3.5rem,0.4fr)] gap-x-2 border-b border-slate-800 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        <span>NCT ID</span>
                        <span>Title</span>
                        <span>Phase</span>
                        <span>Status</span>
                        <span>Sponsor</span>
                        <span className="text-right">n</span>
                      </div>
                      {drug.trials.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-slate-600">No trial details attached.</p>
                      ) : (
                        drug.trials.map((t) => (
                          <TrialRow key={t.nctId} trial={t} fetchedAt={fetchedAt} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </DataPoint>
            )
          }}
        />
      </div>
    </section>
  )
}

function TrialRow({
  trial,
  fetchedAt,
}: {
  trial: ClinicalTrial
  fetchedAt?: string | null
}) {
  const href = trialUrl(trial.nctId)
  const phase = trial.phase && trial.phase !== 'N/A' ? trial.phase : '—'
  const n =
    typeof trial.enrollment === 'number' && trial.enrollment > 0
      ? trial.enrollment.toLocaleString()
      : '—'

  return (
    <DataPoint
      sourceKey={CT_SOURCE}
      label={trial.nctId || trial.title}
      fetchedAt={fetchedAt}
      endpointOverride={`${CT_API}?query.cond=…`}
      recordUrl={href}
      className="border-b border-slate-800/60 last:border-0"
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          onDeepLinkClick('clinical-trials', href, {
            panelId: 'disease-drugs-trials',
            label: trial.nctId,
          })
        }
        className="grid grid-cols-[minmax(5.5rem,0.55fr)_minmax(0,1.4fr)_minmax(4rem,0.45fr)_minmax(5.5rem,0.55fr)_minmax(0,0.85fr)_minmax(3.5rem,0.4fr)] items-center gap-x-2 px-2 py-1.5 hover:bg-slate-800/40 transition-colors group"
      >
        <span className="text-[11px] font-mono text-indigo-300 group-hover:text-indigo-200 truncate">
          {trial.nctId || '—'}
        </span>
        <StyledTooltip content={trial.title || undefined}>
          <span className="text-xs text-slate-200 group-hover:text-cyan-200 truncate">
            {trial.title || '—'}
          </span>
        </StyledTooltip>
        <span
          className={`text-[10px] text-violet-300/90 truncate ${emptyDataClass(phase === '—')}`}
        >
          {phase}
        </span>
        <span
          className={`justify-self-start text-[9px] px-1.5 py-0.5 rounded border truncate max-w-full ${statusClass(trial.status)}`}
        >
          {trial.status || '—'}
        </span>
        <StyledTooltip content={trial.sponsor || undefined}>
          <span
            className={`text-[10px] text-slate-500 truncate ${emptyDataClass(!trial.sponsor)}`}
          >
            {trial.sponsor || '—'}
          </span>
        </StyledTooltip>
        <span
          className={`text-[10px] font-mono tabular-nums text-right text-slate-400 ${emptyDataClass(n === '—')}`}
        >
          {n}
        </span>
      </a>
    </DataPoint>
  )
}
