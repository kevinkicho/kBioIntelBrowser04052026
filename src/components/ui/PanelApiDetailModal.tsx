'use client'

import type { CategoryApiTrace } from '@/lib/panelApiTrace'
import type { PanelSourceInfo } from '@/lib/panelSources'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

interface PanelApiDetailModalProps {
  open: boolean
  onClose: () => void
  panelTitle: string
  panelId?: string
  trace: CategoryApiTrace | null
  /** Catalog provenance (stable docs/endpoints) — preferred over raw join:// tokens */
  sourceInfo?: PanelSourceInfo | null
}

/** True when the string is a public http(s) registry/docs link (not join:// or app path). */
function isBrowseableUrl(u: string | undefined | null): boolean {
  if (!u) return false
  return /^https?:\/\//i.test(u) && !u.startsWith('join://')
}

function formatNonHttpEndpoint(endpoint: string): string {
  if (endpoint.startsWith('join://')) {
    return `Local join (${endpoint.replace(/^join:\/\//, '')})`
  }
  if (endpoint.startsWith('/')) return `App route ${endpoint}`
  return endpoint
}

export function PanelApiDetailModal({
  open,
  onClose,
  panelTitle,
  panelId,
  trace,
  sourceInfo = null,
}: PanelApiDetailModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`API details for ${panelTitle}`}
      data-testid="panel-api-detail-modal"
    >
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-[#12141c] p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">API request details</h3>
            <p className="text-[11px] text-slate-500">
              {panelTitle}
              {panelId ? <span className="font-mono text-slate-600"> · {panelId}</span> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Stable catalog provenance — avoids weird join:// or bare relative paths as "links" */}
        {sourceInfo && (
          <section
            className="mb-3 rounded-lg border border-indigo-900/40 bg-indigo-950/20 p-3 space-y-1.5 text-xs"
            data-testid="panel-api-catalog-source"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300/80">
              Catalog provenance
            </div>
            <Row label="Source" value={sourceInfo.source} />
            <Row label="API" value={sourceInfo.api} mono />
            {sourceInfo.description && (
              <p className="text-[10px] text-slate-400 leading-relaxed">{sourceInfo.description}</p>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              {isBrowseableUrl(sourceInfo.docs) && (
                <a
                  href={sourceInfo.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:text-indigo-300"
                >
                  Docs ↗
                </a>
              )}
              {isBrowseableUrl(sourceInfo.endpoint) && (
                <a
                  href={sourceInfo.endpoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-emerald-400/90 hover:text-emerald-300"
                >
                  Endpoint ↗
                </a>
              )}
              {!isBrowseableUrl(sourceInfo.endpoint) && sourceInfo.endpoint && (
                <StyledTooltip content="Not a public HTTP link">
                  <span className="text-[10px] text-slate-500">
                    Join path: {sourceInfo.endpoint}
                  </span>
                </StyledTooltip>
              )}
            </div>
          </section>
        )}

        {!trace ? (
          <p className="text-xs text-slate-500">
            {sourceInfo
              ? 'No live fetch trace for this session yet — catalog links above are the official sources. Load or refresh the category to capture timing metrics.'
              : "No fetch trace yet. Load or refresh this panel's category to capture request metrics."}
          </p>
        ) : (
          <div className="space-y-3 text-xs">
            <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Category request (BioIntel → aggregator)
              </div>
              <Row label="Method" value={trace.method} mono />
              <Row label="Path" value={trace.requestPath} mono />
              <Row label="CID" value={String(trace.cid)} mono />
              {trace.moleculeName && <Row label="Molecule" value={trace.moleculeName} />}
              <Row label="Started" value={formatTs(trace.startedAt)} mono />
              <Row label="Finished" value={formatTs(trace.finishedAt)} mono />
              <Row label="Duration" value={`${trace.duration_ms} ms`} mono />
              <Row
                label="Cache"
                value={
                  trace.fromCache
                    ? 'HIT (process cache)'
                    : trace.forceRefresh
                      ? 'MISS (forced refresh)'
                      : 'MISS (fresh fetch)'
                }
              />
              <Row
                label="Response keys"
                value={
                  trace.responseSummary.keys.length
                    ? trace.responseSummary.keys.slice(0, 24).join(', ') +
                      (trace.responseSummary.keys.length > 24 ? '…' : '')
                    : '—'
                }
                mono
              />
              <Row
                label="Sources"
                value={`${trace.responseSummary.withData} with data · ${trace.responseSummary.empty} empty · ${trace.responseSummary.errors} err · ${trace.responseSummary.timeouts} timeout / ${trace.responseSummary.sourceCount}`}
              />
            </section>

            <section>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Upstream sources in this category fetch
              </div>
              {trace.sources.length === 0 ? (
                <p className="text-[11px] text-slate-600">
                  No per-source metrics (cached response without prior metrics).
                </p>
              ) : (
                <ul className="space-y-2">
                  {trace.sources.map((s) => (
                    <li
                      key={`${s.source}-${s.duration_ms}`}
                      className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-200">
                          {s.apiLabel || s.source}
                        </span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${statusClass(s.loadStatus)}`}
                        >
                          {s.loadStatus}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          HTTP {s.status} · {s.duration_ms} ms
                        </span>
                        {s.has_data ? (
                          <span className="text-[10px] text-emerald-400/80">has data</span>
                        ) : (
                          <span className="text-[10px] text-slate-600">no data</span>
                        )}
                      </div>
                      {s.organization && (
                        <div className="mt-1 text-[10px] text-slate-500">Org: {s.organization}</div>
                      )}
                      {s.endpoint ? (
                        <div className="mt-1">
                          {isBrowseableUrl(s.endpoint) ? (
                            <a
                              href={s.endpoint}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all font-mono text-[10px] text-cyan-400/90 hover:text-cyan-300"
                            >
                              {s.endpoint}
                            </a>
                          ) : (
                            <StyledTooltip content="Internal path or non-HTTP token — not a public registry link">
                              <span className="break-all font-mono text-[10px] text-slate-500">
                                {formatNonHttpEndpoint(s.endpoint)}
                              </span>
                            </StyledTooltip>
                          )}
                        </div>
                      ) : null}
                      <div className="mt-0.5 flex flex-wrap gap-2">
                        {s.docs && isBrowseableUrl(s.docs) ? (
                          <a
                            href={s.docs}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-[10px] text-indigo-400 hover:text-indigo-300"
                          >
                            Docs ↗
                          </a>
                        ) : null}
                        {s.endpoint && isBrowseableUrl(s.endpoint) ? (
                          <a
                            href={s.endpoint}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-[10px] text-emerald-400/80 hover:text-emerald-300"
                          >
                            Endpoint ↗
                          </a>
                        ) : null}
                      </div>
                      {s.error && (
                        <div className="mt-1 break-all font-mono text-[10px] text-red-400/80">
                          {s.error}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-[9px] leading-relaxed text-slate-600">
              Note: panels in the same category share one multi-source category request. Refresh on a
              card re-runs that category&apos;s upstream fan-out (not a single homepage scrape).
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-[10px] text-slate-500">{label}</span>
      <span className={`min-w-0 break-all text-[11px] text-slate-300 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function statusClass(s: string): string {
  switch (s) {
    case 'loaded':
      return 'bg-emerald-900/40 text-emerald-300'
    case 'empty':
      return 'bg-slate-800 text-slate-400'
    case 'timeout':
      return 'bg-amber-900/40 text-amber-300'
    case 'error':
      return 'bg-red-900/40 text-red-300'
    case 'disabled':
      return 'bg-slate-700 text-slate-400'
    default:
      return 'bg-slate-800 text-slate-400'
  }
}
