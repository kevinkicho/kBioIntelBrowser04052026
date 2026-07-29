'use client'

/**
 * Factual multi-source data hub table.
 * Fact | Value | Source | Open — no narrative AI claims.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { DataHubLedger, DataHubRow } from '@/lib/dataHub'
import {
  buildSourceDirectory,
  dataHubExportFilename,
  dataHubMime,
  dataHubToDelimited,
  downloadResearchKit,
  isDataHubValueEmpty,
  type DataHubExportFormat,
} from '@/lib/dataHub'
import { copyDataHubFactCitation, ledgerSampleStats } from '@/lib/dataHub/citeFact'
import { downloadMondayPack } from '@/lib/dataHub/mondayPack'
import { filterHubRowsATier } from '@/lib/dataHub/aTier'
import type { EvidenceClaim } from '@/lib/domain'
import { downloadFile } from '@/lib/exportData'
import { emptyDataClass } from '@/lib/summaryEmpty'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { SourceDirectoryPanel } from '@/components/dataHub/SourceDirectoryPanel'
import { ResearchViewPrefsBar } from '@/components/dataHub/ResearchViewPrefsBar'
import { ResearchSampleWatermark } from '@/components/dataHub/ResearchSampleWatermark'
import { ResearchShelvesPanel } from '@/components/dataHub/ResearchShelvesPanel'
import { useResearchViewPrefs } from '@/hooks/useResearchViewPrefs'
import { isHubDomainEnabled } from '@/lib/researchViewPrefs'
import { markShelfKitExported, loadResearchShelves } from '@/lib/researchShelves'
import { ApiProvenanceChip } from '@/components/ui/ApiProvenanceChip'
import { HubChangeAlertsPanel } from '@/components/dataHub/HubChangeAlertsPanel'
import { HubClaimGraphPanel } from '@/components/dataHub/HubClaimGraphPanel'

export interface DataHubLedgerProps {
  ledger: DataHubLedger
  onOpenPanel?: (categoryId: string, panelId: string) => void
  className?: string
  testId?: string
  /** When true, hide rows whose value is empty (default true) */
  hideEmpty?: boolean
  /** Compact header for decision mode */
  density?: 'full' | 'compact'
  /** Show source directory under the ledger (default true for full density) */
  showSourceDirectory?: boolean
  /** Optional claims for research kit export */
  claims?: readonly EvidenceClaim[] | null
  /** Show Research kit multi-file export (default true for full density) */
  showResearchKit?: boolean
  /** Show domain pin prefs bar (default true for full density) */
  showPrefsBar?: boolean
  /** Apply saved hub domain filters (default true) */
  respectDomainPrefs?: boolean
  /** Disease / context for Monday pack title */
  contextLabel?: string | null
  /** Show research shelves pin UI */
  showShelves?: boolean
}

function stableHref(url?: string): string | null {
  const u = (url || '').trim()
  if (!/^https?:\/\//i.test(u)) return null
  if (isBrokenSourceShellUrl(u)) return null
  return u
}

/** Compact provenance + actions cell (source name, API chip, cite/panel/link). */
function ProvenanceCell({
  row,
  onOpenPanel,
  subjectLabel,
  subjectId,
}: {
  row: DataHubRow
  onOpenPanel?: (categoryId: string, panelId: string) => void
  subjectLabel?: string
  subjectId?: string
}) {
  const href = stableHref(row.sourceUrl)
  const canPanel = Boolean(row.panelId && row.categoryId && onOpenPanel)
  const [copied, setCopied] = useState(false)
  const sourceKey = row.panelId || row.source || 'pubchem'
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5 sm:gap-y-0.5">
      <span className="inline-flex min-w-0 max-w-full items-center gap-1">
        <span className="truncate text-[10px] text-slate-400" title={row.source}>
          {row.source}
        </span>
        <ApiProvenanceChip
          sourceKey={sourceKey}
          sourceUrl={href || undefined}
          fetchedAt={row.retrievedAt}
          testId={`data-hub-api-${row.id}`}
        />
      </span>
      <span className="inline-flex flex-wrap items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            void copyDataHubFactCitation(row, { subjectLabel, subjectId }).then((ok) => {
              if (ok) {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              }
            })
          }}
          className="rounded border border-slate-700/80 bg-slate-950/60 px-1 py-0.5 text-[9px] font-medium text-slate-300 hover:border-slate-500"
          data-testid={`data-hub-cite-${row.id}`}
          title="Copy citation for lab notebook"
        >
          {copied ? 'Copied' : 'Cite'}
        </button>
        {canPanel && (
          <button
            type="button"
            onClick={() => onOpenPanel!(row.categoryId!, row.panelId!)}
            className="rounded border border-slate-700/80 bg-slate-950/60 px-1 py-0.5 text-[9px] font-medium text-indigo-300 hover:border-indigo-600/50 hover:text-indigo-200"
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
            className="rounded border border-slate-700/80 bg-slate-950/60 px-1 py-0.5 text-[9px] font-medium text-emerald-300/90 hover:border-emerald-700/40 hover:text-emerald-200"
            data-testid={`data-hub-source-${row.id}`}
          >
            ↗
          </a>
        )}
        {!href && !canPanel && (
          <Link
            href="/methodology#honesty"
            className="text-[9px] text-slate-600 hover:text-slate-400"
          >
            ?
          </Link>
        )}
      </span>
    </div>
  )
}

export function DataHubLedgerView({
  ledger,
  onOpenPanel,
  className = '',
  testId = 'data-hub-ledger',
  hideEmpty: hideEmptyProp = true,
  density = 'full',
  showSourceDirectory,
  claims,
  showResearchKit,
  showPrefsBar,
  respectDomainPrefs = true,
  contextLabel,
  showShelves = true,
}: DataHubLedgerProps) {
  const { prefs, patch, hydrated } = useResearchViewPrefs()
  const [hideEmpty, setHideEmpty] = useState(hideEmptyProp)
  const [kitBusy, setKitBusy] = useState(false)
  const [aTierOnly, setATierOnly] = useState(false)
  const showDir = showSourceDirectory ?? density === 'full'
  const showKit = showResearchKit ?? density === 'full'
  const showBar = showPrefsBar ?? density === 'full'
  const showShelf = showShelves && density === 'full'

  // Sync hideEmpty from saved prefs when prefs change (e.g. prefs bar checkbox)
  useEffect(() => {
    if (hydrated) setHideEmpty(prefs.hideEmpty)
  }, [hydrated, prefs.hideEmpty])

  const toggleHideEmpty = () => {
    const next = !hideEmpty
    setHideEmpty(next)
    patch({ hideEmpty: next })
  }

  const byId = useMemo(() => {
    const m = new Map<string, DataHubRow>()
    for (const r of ledger.rows) m.set(r.id, r)
    return m
  }, [ledger.rows])

  const directory = useMemo(() => buildSourceDirectory(ledger), [ledger])

  const identityTrustLine = useMemo(() => {
    const ids = ['id-cid', 'id-inchikey', 'key-chembl', 'key-chebi', 'id-formula']
    const parts = ids
      .map((id) => byId.get(id))
      .filter((r): r is DataHubRow => Boolean(r) && !isDataHubValueEmpty(r!.value))
      .map((r) => `${r.fact.replace(/ \(sample\)/i, '')}: ${r.value}`)
    return parts.slice(0, 4).join(' · ')
  }, [byId])

  const visibleSections = useMemo(() => {
    return ledger.sections
      .map((sec) => {
        let rows = sec.rowIds
          .map((id) => byId.get(id))
          .filter((r): r is DataHubRow => Boolean(r))
          .filter((r) => {
            if (respectDomainPrefs && !isHubDomainEnabled(prefs, r.domain)) {
              return false
            }
            if (hideEmpty && isDataHubValueEmpty(r.value)) return false
            return true
          })
        rows = filterHubRowsATier(rows, aTierOnly).filter(
          (r) => !(hideEmpty && isDataHubValueEmpty(r.value)),
        )
        return { sec, rows }
      })
      .filter(({ rows }) => rows.length > 0)
  }, [ledger.sections, byId, hideEmpty, prefs, respectDomainPrefs, aTierOnly])

  const sample = ledgerSampleStats(ledger)
  const filledCount = sample.factCount

  const exportHub = (format: DataHubExportFormat) => {
    const body = dataHubToDelimited(ledger, format, { includeEmpty: !hideEmpty })
    downloadFile(body, dataHubExportFilename(ledger, format), dataHubMime(format))
  }

  const exportKit = async () => {
    if (kitBusy) return
    setKitBusy(true)
    try {
      await downloadResearchKit({
        ledger,
        claims: claims ?? null,
        includeEmpty: !hideEmpty,
        mode: 'single',
      })
      const shelves = loadResearchShelves()
      for (const s of shelves) {
        markShelfKitExported(s.id, 'molecule', ledger.subjectId)
      }
    } finally {
      setKitBusy(false)
    }
  }

  const exportMonday = () => {
    downloadMondayPack({
      ledger,
      claims: claims ?? null,
      includeEmpty: !hideEmpty,
      contextLabel: contextLabel ?? null,
      includePrefs: true,
    })
  }

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
                'Multi-source factual ledger for this entity.',
                'Each row is a value retrieved from a free public API with its source name.',
                'Open Panel for the siloed full table; Source opens the primary registry when a deep link exists.',
                'Export CSV/TSV for lab notebooks — of-record facts only, not AI narrative.',
                'Research kit downloads one JSON bundle (hub CSV, sources, optional claims, prefs, README).',
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
            onClick={() => exportHub('csv')}
            className="rounded-md border border-emerald-800/40 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300 hover:border-emerald-600/50"
            data-testid={`${testId}-export-csv`}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportHub('tsv')}
            className="rounded-md border border-emerald-800/40 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300/90 hover:border-emerald-600/50"
            data-testid={`${testId}-export-tsv`}
          >
            Export TSV
          </button>
          {showKit && (
            <button
              type="button"
              onClick={() => void exportKit()}
              disabled={kitBusy}
              className="rounded-md border border-sky-800/50 bg-sky-950/30 px-2 py-0.5 text-[10px] font-medium text-sky-200 hover:border-sky-600/50 disabled:opacity-50"
              data-testid={`${testId}-export-kit`}
              title="Single JSON bundle: hub CSV, sources, optional claims, research-view prefs, README"
            >
              {kitBusy ? 'Exporting kit…' : 'Research kit'}
            </button>
          )}
          {showKit && (
            <button
              type="button"
              onClick={exportMonday}
              className="rounded-md border border-violet-800/50 bg-violet-950/30 px-2 py-0.5 text-[10px] font-medium text-violet-200 hover:border-violet-600/50"
              data-testid={`${testId}-monday-pack`}
              title="Lab-meeting one-shot: kit + claims + agenda + methodology pointer"
            >
              Monday pack
            </button>
          )}
          <button
            type="button"
            onClick={() => setATierOnly((v) => !v)}
            className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${
              aTierOnly
                ? 'border-amber-700/50 bg-amber-950/40 text-amber-200'
                : 'border-slate-700 text-slate-400'
            }`}
            data-testid={`${testId}-a-tier`}
            title="Show core / A-tier sources only"
          >
            {aTierOnly ? 'A-tier on' : 'A-tier filter'}
          </button>
          <button
            type="button"
            onClick={toggleHideEmpty}
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

      <div className="border-b border-slate-800/80 px-3 py-2 sm:px-4 space-y-2">
        <ResearchSampleWatermark
          factCount={sample.factCount}
          sourceCount={sample.sourceCount}
          testId={`${testId}-watermark`}
        />
        {identityTrustLine && (
          <p
            className="text-[10px] text-cyan-200/80"
            data-testid={`${testId}-identity-trust`}
          >
            <span className="font-semibold text-cyan-300/90">Identity: </span>
            {identityTrustLine}
          </p>
        )}
      </div>

      {showBar && (
        <div className="border-b border-slate-800/80 px-3 py-2 sm:px-4">
          <ResearchViewPrefsBar
            mode="hub"
            compact
            testId={`${testId}-prefs`}
          />
        </div>
      )}

      {visibleSections.length === 0 ? (
        <div className="px-3 py-6 text-center text-[11px] text-slate-500 sm:px-4">
          No multi-source facts loaded yet. Categories still hydrating — identity rows appear first.{' '}
          <Link href="/methodology#honesty" className="text-indigo-400 hover:underline">
            Why empty?
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-slate-800/80 xl:grid-cols-2 xl:divide-y-0 xl:gap-px xl:bg-slate-800/40">
          {visibleSections.map(({ sec, rows }) => (
            <div
              key={sec.id}
              data-testid={`${testId}-section-${sec.id}`}
              className={`bg-slate-900/50 px-3 py-2 sm:px-4 xl:min-h-0 ${
                rows.length >= 8 ? 'xl:col-span-2' : ''
              }`}
            >
              <h3 className="mb-1 flex items-baseline justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <span>{sec.title}</span>
                <span className="font-normal normal-case tabular-nums text-slate-600">
                  {rows.length}
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[42%]" />
                    <col className="w-[30%]" />
                  </colgroup>
                  <thead>
                    <tr className="text-[9px] uppercase tracking-wide text-slate-600">
                      <th className="pb-0.5 pr-1.5 font-semibold">Fact</th>
                      <th className="pb-0.5 pr-1.5 font-semibold">Value</th>
                      <th className="pb-0.5 font-semibold">Source</th>
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
                          <td className="py-0.5 pr-1.5 text-[11px] font-medium leading-snug text-slate-300">
                            <span className="line-clamp-2 break-words">
                              {r.fact}
                              {r.detail && (
                                <StyledTooltip content={r.detail}>
                                  <span className="ml-0.5 cursor-help text-[9px] text-slate-600">
                                    ⓘ
                                  </span>
                                </StyledTooltip>
                              )}
                            </span>
                          </td>
                          <td className="py-0.5 pr-1.5 text-[11px] leading-snug text-slate-100">
                            <span className="line-clamp-3 break-words">{r.value}</span>
                          </td>
                          <td className="py-0.5">
                            <ProvenanceCell
                              row={r}
                              onOpenPanel={onOpenPanel}
                              subjectLabel={ledger.subjectLabel}
                              subjectId={ledger.subjectId}
                            />
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

      {density === 'full' && (
        <div className="space-y-2 border-t border-slate-800/80 p-3 sm:p-4">
          <HubClaimGraphPanel ledger={ledger} testId={`${testId}-claim-graph`} />
          <HubChangeAlertsPanel
            ledger={ledger}
            entityType={
              ledger.subjectId.match(/^\d+$/)
                ? 'molecule'
                : ledger.subjectId.startsWith('ENSG')
                  ? 'gene'
                  : 'other'
            }
            testId={`${testId}-change-alerts`}
          />
        </div>
      )}

      {showDir && (
        <div className="border-t border-slate-800/80 p-3 sm:p-4">
          <SourceDirectoryPanel
            directory={directory}
            onOpenPanel={onOpenPanel}
            testId={`${testId}-sources`}
          />
        </div>
      )}

      {showShelf && (
        <div className="border-t border-slate-800/80 p-3 sm:p-4">
          <ResearchShelvesPanel
            entityType="molecule"
            entityId={ledger.subjectId}
            entityLabel={ledger.subjectLabel}
            href={`/molecule/${encodeURIComponent(ledger.subjectId)}?view=research`}
            testId={`${testId}-shelves`}
          />
        </div>
      )}
    </section>
  )
}
