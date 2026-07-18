'use client'

import Link from 'next/link'
import type { EvidenceClaim, ScoreAxisKey, ScoreVector } from '@/lib/domain'
import { AXIS_LABELS, AXIS_ORDER } from '@/lib/profileMode'

export interface DecisionStripProps {
  moleculeName: string
  cid: number
  disease?: string | null
  projectId?: string | null
  projectName?: string | null
  rank?: number | null
  boardStatus?: string | null
  /** Multi-axis or composite-only score vector; null = no scores available */
  scores: ScoreVector | null
  /** Extracted Core claims (may be empty after load) */
  claims: EvidenceClaim[]
  /** True while decision categories are still loading */
  claimsLoading: boolean
  /** True once decision categories have finished (loaded or error) */
  coreReady: boolean
  /** CTA: load / retry decision categories */
  onLoadCorePanels?: () => void
}

const CLAIM_TYPE_STYLE: Record<string, string> = {
  mechanism: 'bg-violet-900/40 text-violet-300 border-violet-700/40',
  'binds-target': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  'indicated-for': 'bg-cyan-900/40 text-cyan-300 border-cyan-700/40',
  trial: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  safety: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  property: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
  literature: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
  other: 'bg-slate-700/50 text-slate-400 border-slate-600/40',
}

function axisPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Math.round(value * 100)}`
}

function axisBarColor(key: ScoreAxisKey): string {
  switch (key) {
    case 'efficacy':
      return 'bg-indigo-500'
    case 'clinicalStage':
      return 'bg-blue-500'
    case 'safety':
      return 'bg-emerald-500'
    case 'novelty':
      return 'bg-amber-500'
    case 'identityTrust':
      return 'bg-cyan-500'
    default:
      return 'bg-slate-500'
  }
}

/**
 * Context strip for decision profile — scores + claims.
 * Anti-cosmetic DoD: always shows real content OR an explicit empty state + CTA.
 * Never a title-only shell.
 */
export function DecisionStrip({
  moleculeName,
  cid,
  disease,
  projectId,
  projectName,
  rank,
  boardStatus,
  scores,
  claims,
  claimsLoading,
  coreReady,
  onLoadCorePanels,
}: DecisionStripProps) {
  const hasScores = scores != null
  const hasAxes =
    hasScores &&
    AXIS_ORDER.some((k) => scores!.axes[k] != null)
  const hasClaims = claims.length > 0
  const discoverHref = disease
    ? `/discover?q=${encodeURIComponent(disease)}`
    : '/discover'
  const projectHref = projectId ? `/projects/${encodeURIComponent(projectId)}` : null

  return (
    <section
      className="mb-4 rounded-xl border border-indigo-800/40 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/30 px-4 py-3"
      data-testid="decision-strip"
      aria-label="Decision context strip"
    >
      {/* Header row — always paired with body content below */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/90">
          Decision context
        </span>
        {rank != null && rank > 0 && (
          <span className="text-[10px] font-mono text-slate-500">#{rank}</span>
        )}
        {disease && (
          <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={disease}>
            Disease: <span className="text-slate-300">{disease}</span>
          </span>
        )}
        {projectId && (
          projectHref ? (
            <Link
              href={projectHref}
              className="text-[10px] text-emerald-400/90 hover:text-emerald-300 truncate max-w-[160px]"
              title={projectName ?? projectId}
            >
              Project: {projectName ?? projectId.slice(0, 12)}
            </Link>
          ) : (
            <span className="text-[10px] text-slate-500">Project: {projectId.slice(0, 12)}</span>
          )
        )}
        {boardStatus && (
          <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-600/50 text-slate-400 capitalize">
            {boardStatus}
          </span>
        )}
        <span className="ml-auto text-[9px] text-slate-600 font-mono">CID:{cid}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* ── Scores column ─────────────────────────────────────────── */}
        <div
          className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-3"
          data-testid="decision-strip-scores"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-semibold text-slate-300">Scores</h4>
            {hasScores && (
              <span
                className="text-sm font-bold text-indigo-300 tabular-nums"
                data-testid="decision-strip-composite"
              >
                {Math.round(scores!.composite * 100)}
                <span className="text-[10px] font-normal text-slate-500 ml-0.5">composite</span>
              </span>
            )}
          </div>

          {hasScores && hasAxes ? (
            <div className="space-y-1.5">
              {AXIS_ORDER.map((key) => {
                const v = scores!.axes[key]
                const status = scores!.axisStatus[key]
                const missing = v == null
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-[88px] shrink-0 truncate">
                      {AXIS_LABELS[key]}
                    </span>
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      {!missing && (
                        <div
                          className={`h-1.5 rounded-full transition-all ${axisBarColor(key)}`}
                          style={{ width: `${Math.round((v as number) * 100)}%` }}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] w-8 text-right tabular-nums ${
                        missing ? 'text-slate-600' : 'text-slate-400'
                      }`}
                      title={missing ? `Status: ${status}` : undefined}
                    >
                      {axisPct(v)}
                    </span>
                  </div>
                )
              })}
              {scores!.scorePhase && (
                <p className="text-[9px] text-slate-600 mt-1">
                  Phase: {scores!.scorePhase}
                  {scores!.rubricId ? ` · ${scores!.rubricId}` : ''}
                </p>
              )}
            </div>
          ) : hasScores ? (
            <div data-testid="decision-strip-scores-composite-only">
              <p className="text-xs text-slate-400 mb-2">
                Composite score from discovery deep-link. Full multi-axis vector not attached.
              </p>
              <Link
                href={discoverHref}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                Re-rank in Discover for axis breakdown →
              </Link>
            </div>
          ) : (
            <div data-testid="decision-strip-scores-empty">
              <p className="text-xs text-slate-500 mb-2">
                No discovery scores for <span className="text-slate-400">{moleculeName}</span>.
                Open from Discover or a project board to attach multi-axis scores.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={discoverHref}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-600/80 hover:bg-indigo-500 text-white transition-colors"
                  data-testid="decision-strip-scores-cta"
                >
                  Rank in Discover
                </Link>
                {projectHref && (
                  <Link
                    href={projectHref}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-600 text-slate-300 hover:border-slate-500 transition-colors"
                  >
                    Open project
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Claims column ─────────────────────────────────────────── */}
        <div
          className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-3"
          data-testid="decision-strip-claims"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-semibold text-slate-300">Evidence claims</h4>
            {hasClaims && (
              <span className="text-[10px] text-slate-500">{claims.length} shown</span>
            )}
          </div>

          {claimsLoading && !hasClaims ? (
            <div className="space-y-2" data-testid="decision-strip-claims-loading">
              <p className="text-xs text-slate-500 animate-pulse">
                Extracting claims from Core decision panels…
              </p>
              <div className="h-2 bg-slate-800 rounded animate-pulse w-3/4" />
              <div className="h-2 bg-slate-800 rounded animate-pulse w-1/2" />
            </div>
          ) : hasClaims ? (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {claims.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-1.5 text-[11px] leading-snug"
                  data-testid="decision-strip-claim"
                >
                  <span
                    className={`shrink-0 mt-0.5 text-[9px] px-1 py-0.5 rounded border ${
                      CLAIM_TYPE_STYLE[c.claimType] ?? CLAIM_TYPE_STYLE.other
                    }`}
                  >
                    {c.claimType}
                  </span>
                  <span className="text-slate-300 min-w-0">
                    <span className="line-clamp-2">{c.statement}</span>
                    {c.provenance?.source && (
                      <span className="block text-[9px] text-slate-600 mt-0.5">
                        {c.provenance.sourceUrl ? (
                          <a
                            href={c.provenance.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400/80 hover:text-indigo-300 hover:underline"
                            data-testid="decision-strip-claim-source"
                          >
                            {c.provenance.source} ↗
                          </a>
                        ) : (
                          c.provenance.source
                        )}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : coreReady ? (
            <div data-testid="decision-strip-claims-empty">
              <p className="text-xs text-slate-500 mb-2">
                No Core evidence claims extracted for this molecule.
                Empty ≠ absence of biology — only that decision-panel sources returned nothing extractable.
              </p>
              <div className="flex flex-wrap gap-2">
                {onLoadCorePanels && (
                  <button
                    type="button"
                    onClick={onLoadCorePanels}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                    data-testid="decision-strip-claims-cta"
                  >
                    Reload Core panels
                  </button>
                )}
                <a
                  href="#clinical-safety"
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-600 text-slate-300 hover:border-slate-500 transition-colors"
                >
                  Jump to Clinical &amp; Safety
                </a>
              </div>
            </div>
          ) : (
            <div data-testid="decision-strip-claims-pending">
              <p className="text-xs text-slate-500 mb-2">
                Core decision panels not loaded yet — claims appear after ChEMBL, trials, and AE data arrive.
              </p>
              {onLoadCorePanels && (
                <button
                  type="button"
                  onClick={onLoadCorePanels}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-600/80 hover:bg-indigo-500 text-white transition-colors"
                  data-testid="decision-strip-claims-cta"
                >
                  Load Core panels
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
