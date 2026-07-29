'use client'

/**
 * Gene / expression source card with:
 * - Always-on API provenance (+ deterministic of-record AI note)
 * - Empty sources dimmed (opacity) and hidden by default; reveal per card or parent toggle
 * - Result status for troubleshooting (loaded / empty / error)
 */

import { useState, type ReactNode } from 'react'
import { ApiProvenanceChip } from '@/components/ui/ApiProvenanceChip'
import { HelperTip } from '@/components/ui/HelperTip'
import { resolveProvenance } from '@/lib/provenance'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export type SourceResultStatus = 'loaded' | 'empty' | 'error' | 'idle' | 'loading'

export interface SourceEvidenceCardProps {
  title: string
  /** panelSources / provenance key e.g. dgidb, disgenet, clinvar, bgee */
  sourceKey: string
  /** Human source line under title */
  sourceLabel?: string
  rowCount?: number
  fetchedAt?: Date | string | null
  resultStatus?: SourceResultStatus
  resultMessage?: string
  /** Deep link to primary registry search for this entity */
  registryUrl?: string
  empty?: boolean
  /**
   * When empty and parent has not forced showEmpty, collapse body by default.
   * User can still expand this single card.
   */
  defaultCollapsedWhenEmpty?: boolean
  /** Parent “show all empty” override */
  forceExpanded?: boolean
  className?: string
  testId?: string
  children?: ReactNode
  /** Optional secondary actions (CSV, etc.) */
  headerExtra?: ReactNode
}

const STATUS_LABEL: Record<SourceResultStatus, string> = {
  loaded: 'Loaded',
  empty: 'Empty (0 rows)',
  error: 'Error',
  idle: 'Not run',
  loading: 'Loading…',
}

const STATUS_CLASS: Record<SourceResultStatus, string> = {
  loaded: 'border-emerald-800/50 bg-emerald-950/30 text-emerald-300',
  empty: 'border-slate-700 bg-slate-900/50 text-slate-500',
  error: 'border-rose-800/50 bg-rose-950/30 text-rose-300',
  idle: 'border-slate-700 text-slate-600',
  loading: 'border-amber-800/40 bg-amber-950/20 text-amber-300',
}

export function SourceEvidenceCard({
  title,
  sourceKey,
  sourceLabel,
  rowCount,
  fetchedAt,
  resultStatus,
  resultMessage,
  registryUrl,
  empty: emptyProp,
  defaultCollapsedWhenEmpty = true,
  forceExpanded = false,
  className = '',
  testId = 'source-evidence-card',
  children,
  headerExtra,
}: SourceEvidenceCardProps) {
  const empty =
    emptyProp ??
    (resultStatus === 'empty' || (typeof rowCount === 'number' && rowCount === 0))
  const status: SourceResultStatus =
    resultStatus ?? (empty ? 'empty' : 'loaded')

  const [localOpen, setLocalOpen] = useState(!empty || !defaultCollapsedWhenEmpty)
  const expanded = forceExpanded || localOpen || !empty

  const prov = resolveProvenance(sourceKey, {
    recordUrl: registryUrl,
    fetchedAt,
  })
  const docsOk =
    prov.docs &&
    /^https?:\/\//i.test(prov.docs) &&
    !isBrokenSourceShellUrl(prov.docs)
  const registryOk =
    registryUrl &&
    /^https?:\/\//i.test(registryUrl) &&
    !isBrokenSourceShellUrl(registryUrl)

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden transition-opacity ${
        empty ? 'opacity-30' : 'opacity-100'
      } ${className}`}
      data-testid={testId}
      data-empty={empty ? 'true' : 'false'}
      data-result={status}
      data-expanded={expanded ? 'true' : 'false'}
      aria-label={title}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-xs font-semibold text-slate-100">{title}</h3>
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium tabular-nums ${STATUS_CLASS[status]}`}
              data-testid={`${testId}-status`}
            >
              {STATUS_LABEL[status]}
              {typeof rowCount === 'number' ? ` · ${rowCount}` : ''}
            </span>
          </div>
          {(sourceLabel || prov.api) && (
            <p className="mt-0.5 text-[9px] text-slate-500">
              {sourceLabel || prov.api}
              {prov.organization ? ` · ${prov.organization}` : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <ApiProvenanceChip
            sourceKey={sourceKey}
            sourceUrl={registryUrl || prov.docs}
            fetchedAt={fetchedAt}
            testId={`${testId}-api-prov`}
          />
          <span
            className="inline-flex items-center gap-0.5 rounded border border-slate-700/70 bg-slate-950/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500"
            data-testid={`${testId}-ai-prov`}
          >
            Of-record
            <HelperTip
              content={[
                'This card is of-record free-API presentation — no model generation for these rows.',
                'AI copilot (if used elsewhere on the page) is non-of-record and does not rewrite this table.',
                `Gather result: ${STATUS_LABEL[status]}${typeof rowCount === 'number' ? ` (${rowCount} rows)` : ''}.`,
                resultMessage || '',
              ]
                .filter(Boolean)
                .join('\n\n')}
              label="About of-record presentation"
              testId={`${testId}-ai-prov-help`}
            />
          </span>
          {docsOk && (
            <a
              href={prov.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400 hover:underline"
              onClick={() =>
                onDeepLinkClick(sourceKey, prov.docs, {
                  panelId: sourceKey,
                  label: 'docs',
                })
              }
              data-testid={`${testId}-docs`}
            >
              Docs ↗
            </a>
          )}
          {registryOk && (
            <a
              href={registryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-emerald-400/90 hover:underline"
              onClick={() =>
                onDeepLinkClick(sourceKey, registryUrl!, {
                  panelId: sourceKey,
                  label: 'registry',
                })
              }
              data-testid={`${testId}-registry`}
            >
              Source ↗
            </a>
          )}
          {headerExtra}
          {empty && (
            <button
              type="button"
              className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300 hover:border-indigo-600/40 hover:text-indigo-200"
              aria-expanded={expanded}
              data-testid={`${testId}-reveal`}
              onClick={() => setLocalOpen((v) => !v)}
            >
              {expanded ? 'Hide empty' : 'Reveal empty'}
            </button>
          )}
        </div>
      </div>

      {/* Always-visible gather result strip for troubleshooting */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-800/60 bg-slate-950/40 px-3 py-1.5 text-[10px] text-slate-500"
        data-testid={`${testId}-gather-strip`}
      >
        <span>
          Result:{' '}
          <span className="text-slate-400">
            {resultMessage ||
              (empty
                ? 'No rows returned for this free-API gather (empty ≠ no biology).'
                : `${rowCount ?? '—'} row(s) in session sample.`)}
          </span>
        </span>
        {fetchedAt != null && (
          <span className="tabular-nums text-slate-600">
            Fetched{' '}
            {fetchedAt instanceof Date
              ? fetchedAt.toLocaleString()
              : String(fetchedAt)}
          </span>
        )}
        {prov.endpoint && (
          <span className="max-w-full truncate font-mono text-[9px] text-slate-600" title={prov.endpoint}>
            {prov.endpoint}
          </span>
        )}
      </div>

      {expanded && (
        <div className="px-0 py-0" data-testid={`${testId}-body`}>
          {children}
        </div>
      )}
    </section>
  )
}

/** Parent control: show/hide all empty source cards on a gene tab. */
export function EmptySourcesToggle({
  emptyCount,
  showEmpty,
  onToggle,
  testId = 'empty-sources-toggle',
}: {
  emptyCount: number
  showEmpty: boolean
  onToggle: () => void
  testId?: string
}) {
  if (emptyCount <= 0) return null
  return (
    <div
      className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-1.5"
      data-testid={testId}
    >
      <p className="text-[10px] text-slate-500">
        {emptyCount} empty source{emptyCount === 1 ? '' : 's'} hidden by default (opacity dimmed when
        revealed). Provenance stays available for troubleshooting.
      </p>
      <button
        type="button"
        onClick={onToggle}
        className="rounded border border-slate-700 px-2 py-0.5 text-[10px] font-medium text-indigo-300 hover:border-indigo-600/40"
        data-testid={`${testId}-btn`}
        aria-pressed={showEmpty}
      >
        {showEmpty ? 'Hide empty sources' : `Show ${emptyCount} empty source${emptyCount === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}
