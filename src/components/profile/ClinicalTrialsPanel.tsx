'use client'

import { memo, useMemo, useState, type ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { isMatch } from '@/hooks/useDiseaseContext'
import type { ClinicalTrial } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
  parseListDate,
} from '@/lib/listControls'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { emitProductEvent } from '@/lib/productEvents'
import { eudraCtRegisterUrl } from '@/lib/euClinicalTrials'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40',
  RECRUITING: 'bg-blue-900/40 text-blue-300 border-blue-800/40',
  ACTIVE_NOT_RECRUITING: 'bg-amber-900/40 text-amber-300 border-amber-800/40',
  NOT_YET_RECRUITING: 'bg-sky-900/30 text-sky-300 border-sky-800/40',
  TERMINATED: 'bg-red-900/40 text-red-300 border-red-800/40',
  WITHDRAWN: 'bg-red-900/30 text-red-400 border-red-800/30',
  SUSPENDED: 'bg-orange-900/30 text-orange-300 border-orange-800/40',
}

/** Prefer the most recent of start/completion for “latest first” ranking. */
function trialLatestDate(t: ClinicalTrial): string {
  const s = parseListDate(t.startDate)
  const c = parseListDate(t.completionDate)
  if (s === 0 && c === 0) return t.startDate || t.completionDate || ''
  return c >= s ? t.completionDate || t.startDate || '' : t.startDate || t.completionDate || ''
}

function formatShortDate(raw: string | undefined): string {
  if (!raw?.trim()) return '—'
  const ms = parseListDate(raw)
  if (!ms) return raw.slice(0, 10)
  try {
    return new Date(ms).toISOString().slice(0, 10)
  } catch {
    return raw.slice(0, 10)
  }
}

function trialHref(t: ClinicalTrial): string | null {
  return t.nctId
    ? `https://clinicaltrials.gov/study/${encodeURIComponent(t.nctId)}`
    : null
}

const COL_DEFS = [
  { id: 'nct', label: 'NCT ID', defaultVisible: true },
  { id: 'title', label: 'Title', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'phase', label: 'Phase', defaultVisible: true },
  { id: 'start', label: 'Start', defaultVisible: true },
  { id: 'end', label: 'Completion', defaultVisible: true },
  { id: 'sponsor', label: 'Sponsor', defaultVisible: true },
  { id: 'enroll', label: 'Enroll', defaultVisible: true },
] as const

type ColId = (typeof COL_DEFS)[number]['id']

/** Dense table-like grid — works with PaginatedList div wrappers. */
const GRID =
  'grid grid-cols-[minmax(6rem,0.55fr)_minmax(10rem,1.6fr)_minmax(5.5rem,0.55fr)_minmax(4rem,0.4fr)_minmax(4.75rem,0.45fr)_minmax(4.75rem,0.45fr)_minmax(5rem,0.75fr)_minmax(3.25rem,0.35fr)] gap-x-2'

export const ClinicalTrialsPanel = memo(function ClinicalTrialsPanel({
  trials,
  panelId,
  lastFetched,
  diseaseName,
}: {
  trials: ClinicalTrial[]
  panelId?: string
  lastFetched?: Date
  diseaseName?: string
}) {
  const list = Array.isArray(trials) ? trials : []
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<ClinicalTrial>((t) => trialLatestDate(t), {
        newest: 'Latest → oldest',
        oldest: 'Oldest → latest',
        idPrefix: 'date',
      }),
      ...dateSortOptions<ClinicalTrial>((t) => t.startDate, {
        newest: 'Start newest',
        oldest: 'Start oldest',
        idPrefix: 'start',
      }),
      ...dateSortOptions<ClinicalTrial>((t) => t.completionDate, {
        newest: 'Completion newest',
        oldest: 'Completion oldest',
        idPrefix: 'end',
      }),
      ...alphaSortOptions<ClinicalTrial>((t) => t.title || t.nctId),
      ...alphaSortOptions<ClinicalTrial>((t) => t.status || '').map((o) => ({
        ...o,
        id: `status-${o.id}`,
        label: o.id.includes('asc') ? 'Status A–Z' : 'Status Z–A',
      })),
      ...alphaSortOptions<ClinicalTrial>((t) => t.phase || '').map((o) => ({
        ...o,
        id: `phase-${o.id}`,
        label: o.id.includes('asc') ? 'Phase A–Z' : 'Phase Z–A',
      })),
      ...numberSortOptions<ClinicalTrial>((t) => t.enrollment ?? 0, {
        high: 'Largest enrollment',
        low: 'Smallest enrollment',
        idPrefix: 'enroll',
      }),
      ...alphaSortOptions<ClinicalTrial>((t) => t.sponsor || '').map((o) => ({
        ...o,
        id: `sponsor-${o.id}`,
        label: o.id.includes('asc') ? 'Sponsor A–Z' : 'Sponsor Z–A',
      })),
    ],
    [],
  )

  const matchCount = diseaseName
    ? list.filter((t) =>
        isMatch([t.title, ...(t.conditions || [])].join(' '), diseaseName),
      ).length
    : 0

  const titleSuffix =
    diseaseName && matchCount > 0 ? (
      <span className="text-xs font-normal text-amber-300 ml-2">
        {matchCount} relevant to {diseaseName}
      </span>
    ) : null

  function toggleExpand(nctId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      const opening = !next.has(nctId)
      if (next.has(nctId)) next.delete(nctId)
      else next.add(nctId)
      if (opening) {
        emitProductEvent('ui_surface_action', {
          surface: 'clinical_trials_table',
          action: 'row_expand',
          nctId,
        })
      }
      return next
    })
  }

  if (list.length === 0) {
    return (
      <Panel
        title="Clinical Trials"
        panelId={panelId}
        lastFetched={lastFetched}
        empty="No clinical trials found for this molecule."
      />
    )
  }

  return (
    <Panel
      title={`Clinical Trials (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      titleExtra={titleSuffix}
    >
      <p className="mb-2 text-[10px] text-slate-600 leading-relaxed">
        ClinicalTrials.gov studies — default sort is{' '}
        <strong className="text-slate-500">latest → oldest</strong> (by completion, else start).
        Click an NCT ID for conditions & interventions. Use search, sort, Columns, and Export CSV.
      </p>
      <div className="overflow-x-auto -mx-0.5 px-0.5" data-testid="clinical-trials-table">
        <FilterablePaginatedList
          items={list}
          getSearchText={(t) =>
            [
              t.title,
              t.nctId,
              t.status,
              t.phase,
              t.sponsor,
              t.startDate,
              t.completionDate,
              ...(t.conditions || []),
              ...(t.interventions || []),
              ...(t.interventionDetails?.map((i) => i.name) || []),
            ]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="date-desc"
          filterPlaceholder="Search title, NCT, status, phase, sponsor, condition…"
          getKey={(t, i) => `${t.nctId || t.title}-${i}`}
          pageSize={12}
          className="space-y-0 min-w-[52rem]"
          csvExport={{
            filename: 'clinical-trials.csv',
            columns: [
              { header: 'NCT_ID', get: (t) => t.nctId },
              { header: 'Title', get: (t) => t.title },
              { header: 'Status', get: (t) => t.status },
              { header: 'Phase', get: (t) => t.phase },
              { header: 'Start', get: (t) => t.startDate },
              { header: 'Completion', get: (t) => t.completionDate },
              { header: 'Sponsor', get: (t) => t.sponsor },
              { header: 'Enrollment', get: (t) => t.enrollment },
              {
                header: 'Conditions',
                get: (t) => (t.conditions || []).join('; '),
              },
              {
                header: 'Interventions',
                get: (t) =>
                  (t.interventionDetails || [])
                    .map((i) => i.name)
                    .concat(t.interventions || [])
                    .filter(Boolean)
                    .join('; '),
              },
              {
                header: 'URL',
                get: (t) => trialHref(t) || '',
              },
            ],
          }}
          columnVisibility={{
            columns: COL_DEFS.map((c) => ({
              id: c.id,
              label: c.label,
              defaultVisible: c.defaultVisible,
            })),
            renderItemWithColumns: (trial, index, visible) => {
              const conditionText = [trial.title, ...(trial.conditions || [])].join(' ')
              const diseaseMatch = diseaseName
                ? isMatch(conditionText, diseaseName)
                : false
              const href = trialHref(trial)
              const phaseEmpty = isEmptyMetric(trial.phase) || trial.phase === 'N/A'
              const statusBadge =
                STATUS_BADGE[trial.status] ||
                'bg-slate-800/60 text-slate-400 border-slate-700/40'
              const start = formatShortDate(trial.startDate)
              const end = formatShortDate(trial.completionDate)
              const enroll =
                trial.enrollment != null && trial.enrollment > 0
                  ? trial.enrollment.toLocaleString()
                  : '—'
              const key = trial.nctId || `row-${index}`
              const isOpen = expanded.has(key)
              const show = (id: ColId) => visible.has(id)

              const cell = (id: ColId, node: ReactNode, className = '') =>
                show(id) ? <div className={className}>{node}</div> : null

              const header =
                index === 0 ? (
                  <div
                    className={`${GRID} px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80 sticky top-0 bg-slate-900/95 z-[1]`}
                    role="row"
                  >
                    {show('nct') && <span>NCT ID</span>}
                    {show('title') && <span>Title</span>}
                    {show('status') && <span>Status</span>}
                    {show('phase') && <span>Phase</span>}
                    {show('start') && <span>Start</span>}
                    {show('end') && <span>End</span>}
                    {show('sponsor') && <span>Sponsor</span>}
                    {show('enroll') && <span className="text-right">n</span>}
                  </div>
                ) : null

              const detail = isOpen ? (
                <div
                  className="mx-2 mb-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] space-y-1.5"
                  data-testid={`trial-detail-${key}`}
                >
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
                    <span>
                      Start: <span className="font-mono text-slate-400">{start}</span>
                    </span>
                    <span>
                      Completion: <span className="font-mono text-slate-400">{end}</span>
                    </span>
                    {trial.enrollment != null && trial.enrollment > 0 && (
                      <span>
                        Enrollment:{' '}
                        <span className="font-mono text-slate-400">
                          {trial.enrollment.toLocaleString()}
                        </span>
                      </span>
                    )}
                  </div>
                  {(trial.conditions?.length ?? 0) > 0 && (
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-600">
                        Conditions
                      </span>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {trial.conditions.map((c) => (
                          <span
                            key={c}
                            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {((trial.interventionDetails?.length ?? 0) > 0 ||
                    (trial.interventions?.length ?? 0) > 0) && (
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-600">
                        Interventions
                      </span>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {(trial.interventionDetails?.length
                          ? trial.interventionDetails
                          : (trial.interventions || []).map((name) => ({
                              name,
                              type: '',
                            }))
                        ).map((intv, i) => (
                          <span
                            key={`${intv.name}-${i}`}
                            className={`rounded border px-1.5 py-0.5 text-[10px] ${
                              intv.type === 'DRUG' || intv.type === 'BIOLOGICAL'
                                ? 'border-amber-800/40 bg-amber-950/30 text-amber-300'
                                : 'border-slate-700 bg-slate-900 text-slate-400'
                            }`}
                          >
                            {intv.name}
                            {intv.type ? (
                              <span className="text-slate-600 ml-1">{intv.type}</span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[10px] text-indigo-400 hover:underline"
                        onClick={() =>
                          onDeepLinkClick('clinicaltrials', href, {
                            panelId: 'clinical-trials',
                            label: trial.nctId,
                          })
                        }
                      >
                        ClinicalTrials.gov ↗
                      </a>
                    )}
                    {(trial.eudraCtNumbers ?? []).map((eu) => {
                      const euHref = eudraCtRegisterUrl(eu)
                      return (
                        <StyledTooltip key={eu} content="EU Clinical Trials Register (EudraCT)">
                          <a
                            href={euHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-[10px] text-cyan-400 hover:underline"
                            onClick={() =>
                              onDeepLinkClick('other', euHref, {
                                panelId: 'clinical-trials',
                                label: eu,
                              })
                            }
                          >
                            EU CTR {eu} ↗
                          </a>
                        </StyledTooltip>
                      )
                    })}
                  </div>
                </div>
              ) : null

              return (
                <div data-testid={`clinical-trial-row-${trial.nctId || index}`}>
                  {header}
                  <div
                    className={`${GRID} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50 transition-colors group ${
                      diseaseMatch ? 'bg-amber-950/15' : ''
                    }`}
                    role="row"
                  >
                    {cell(
                      'nct',
                      <StyledTooltip
                        content={isOpen ? 'Hide details' : 'Show conditions & interventions'}
                        className="w-full"
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpand(key)}
                          className="text-left w-full min-w-0"
                          aria-expanded={isOpen}
                          aria-label={
                            isOpen ? 'Hide details' : 'Show conditions & interventions'
                          }
                        >
                          <span className="text-[11px] font-mono text-indigo-300 group-hover:text-indigo-200 truncate block">
                            <span className="text-slate-600 mr-0.5" aria-hidden>
                              {isOpen ? '▾' : '▸'}
                            </span>
                            {trial.nctId || '—'}
                          </span>
                        </button>
                      </StyledTooltip>,
                    )}
                    {cell(
                      'title',
                      <StyledTooltip
                        content={isOpen ? 'Collapse detail' : 'Expand detail'}
                        className="w-full"
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpand(key)}
                          className="text-left w-full min-w-0"
                          aria-label={isOpen ? 'Collapse detail' : 'Expand detail'}
                        >
                          <span className="text-sm text-slate-100 group-hover:text-cyan-200 line-clamp-2 block">
                            {trial.title || '—'}
                            {diseaseMatch && (
                              <span className="ml-1 text-[9px] text-amber-300 font-normal">
                                Match
                              </span>
                            )}
                          </span>
                        </button>
                      </StyledTooltip>,
                    )}
                    {cell(
                      'status',
                      <StyledTooltip content={trial.status || undefined}>
                        <span
                          className={`inline-block text-[9px] px-1.5 py-0.5 rounded border truncate max-w-full ${statusBadge}`}
                        >
                          {(trial.status || '—').replace(/_/g, ' ')}
                        </span>
                      </StyledTooltip>,
                    )}
                    {cell(
                      'phase',
                      <span
                        className={`text-[11px] text-violet-300/90 truncate ${emptyDataClass(phaseEmpty)}`}
                      >
                        {phaseEmpty ? '—' : trial.phase}
                      </span>,
                    )}
                    {cell(
                      'start',
                      <span
                        className={`text-[10px] font-mono tabular-nums text-slate-400 ${emptyDataClass(start === '—')}`}
                      >
                        {start}
                      </span>,
                    )}
                    {cell(
                      'end',
                      <span
                        className={`text-[10px] font-mono tabular-nums text-slate-400 ${emptyDataClass(end === '—')}`}
                      >
                        {end}
                      </span>,
                    )}
                    {cell(
                      'sponsor',
                      <StyledTooltip content={trial.sponsor || undefined}>
                        <span
                          className={`text-[10px] text-slate-500 truncate block ${emptyDataClass(!trial.sponsor)}`}
                        >
                          {trial.sponsor || '—'}
                        </span>
                      </StyledTooltip>,
                    )}
                    {cell(
                      'enroll',
                      <span
                        className={`text-[10px] font-mono tabular-nums text-slate-400 ${emptyDataClass(enroll === '—')}`}
                      >
                        {enroll}
                      </span>,
                      'text-right',
                    )}
                  </div>
                  {detail}
                </div>
              )
            },
          }}
        />
      </div>
    </Panel>
  )
})
