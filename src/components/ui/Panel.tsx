'use client'

import { useState } from 'react'
import { getFreshnessStatus } from '@/lib/dataFreshness'
import { getPanelSource } from '@/lib/panelSources'
import type { DataLoadStatus } from '@/lib/dataStatus'
import { emptyMessageForStatus } from '@/lib/dataStatus'
import { getPanelTier, TIER_BADGE_CLASS, TIER_LABEL } from '@/lib/panelTiers'
import {
  getPanelDisabledReason,
  isPanelSourceDisabled,
} from '@/lib/api/sourceAvailability'
import {
  isCategoryLoading,
  useProfilePanelContext,
} from '@/components/profile/ProfilePanelContext'
import { filterTraceForPanel, loadStatusFromPanelTrace } from '@/lib/panelApiTrace'
import { PanelApiDetailModal } from './PanelApiDetailModal'

type SourceHealth = 'healthy' | 'slow' | 'errors' | 'unknown'

interface PanelProps {
  title: string
  panelId?: string
  lastFetched?: Date
  children?: React.ReactNode
  className?: string
  titleExtra?: React.ReactNode
  empty?: string
  sourceHealth?: SourceHealth
  /** Scientific honesty: data vs empty vs timeout/error/disabled */
  loadStatus?: DataLoadStatus
  loadError?: string
  /** Optional override; otherwise uses ProfilePanelContext */
  onRefresh?: () => void
  refreshing?: boolean
}

const HEALTH_BADGE: Record<Exclude<SourceHealth, 'unknown' | 'healthy'>, { text: string; className: string }> = {
  slow: { text: 'slow', className: 'bg-amber-900/40 text-amber-300 border border-amber-700/30' },
  errors: { text: 'errors', className: 'bg-red-900/40 text-red-300 border border-red-700/30' },
}

const LOAD_STATUS_BADGE: Partial<Record<DataLoadStatus, { text: string; className: string }>> = {
  timeout: { text: 'timeout', className: 'bg-amber-900/40 text-amber-300 border border-amber-700/30' },
  error: { text: 'error', className: 'bg-red-900/40 text-red-300 border border-red-700/30' },
  disabled: { text: 'disabled', className: 'bg-slate-700/60 text-slate-400 border border-slate-600/40' },
  empty: { text: 'no data', className: 'bg-slate-800/60 text-slate-500 border border-slate-700/40' },
}

export function Panel({
  title,
  panelId,
  lastFetched,
  children,
  className = '',
  titleExtra,
  empty,
  sourceHealth,
  loadStatus,
  loadError,
  onRefresh: onRefreshProp,
  refreshing: refreshingProp,
}: PanelProps) {
  const [showSource, setShowSource] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const profileCtx = useProfilePanelContext()

  const catId = panelId && profileCtx ? profileCtx.getCategoryForPanel(panelId) : null
  const refreshing =
    refreshingProp ??
    (catId && profileCtx ? isCategoryLoading(profileCtx.loadingCategories, catId) : false)
  const onRefresh =
    onRefreshProp ??
    (catId && profileCtx
      ? () => profileCtx.refreshCategory(catId)
      : undefined)

  const fullTrace =
    catId && profileCtx?.categoryTraces[catId] ? profileCtx.categoryTraces[catId]! : null
  const panelTrace = filterTraceForPanel(fullTrace, panelId || '')

  const freshness = panelId && lastFetched ? getFreshnessStatus(panelId, lastFetched) : null
  const sourceInfo = panelId ? getPanelSource(panelId) : null
  const disabledReason = panelId ? getPanelDisabledReason(panelId) : undefined
  const sourceDisabled = panelId ? isPanelSourceDisabled(panelId) : false
  // Prefer explicit prop; else derive from category API traces (timeout/error honesty)
  const derivedFromTrace =
    !loadStatus && panelId && panelTrace?.sources?.length
      ? loadStatusFromPanelTrace(panelTrace.sources, panelId)
      : undefined
  const effectiveLoadStatus: DataLoadStatus | undefined = sourceDisabled
    ? 'disabled'
    : loadStatus ?? derivedFromTrace
  const statusBadge =
    effectiveLoadStatus && effectiveLoadStatus !== 'loaded'
      ? LOAD_STATUS_BADGE[effectiveLoadStatus]
      : undefined
  const tier = panelId ? getPanelTier(panelId) : null
  const showTierBadge = tier === 'supporting' || tier === 'experimental'
  // Only override empty copy for true failures; do not treat pure "empty" as banner when children exist
  const failureStatus =
    effectiveLoadStatus === 'timeout' ||
    effectiveLoadStatus === 'error' ||
    effectiveLoadStatus === 'disabled'
  const emptyText = empty
    ? emptyMessageForStatus(failureStatus ? effectiveLoadStatus : undefined, empty)
    : failureStatus
      ? emptyMessageForStatus(effectiveLoadStatus, 'No data for this molecule')
      : null
  // Trace error string for loadError when not provided
  const derivedError =
    loadError ||
    panelTrace?.sources?.find(
      (s) =>
        (s.panelId === panelId || s.source === panelId) &&
        (s.loadStatus === 'error' || s.loadStatus === 'timeout') &&
        s.error,
    )?.error
  const nextWorkTitle =
    disabledReason ||
    (sourceDisabled
      ? 'Next work target: enable a verified free public JSON endpoint for this source'
      : undefined)

  return (
    <div
      className={`bg-slate-800/50 border rounded-xl p-5 ${
        sourceDisabled
          ? 'border-amber-900/40 opacity-90'
          : 'border-slate-700'
      } ${className}`}
      data-testid={panelId ? `panel-${panelId}` : undefined}
      data-source-disabled={sourceDisabled ? 'true' : undefined}
      title={nextWorkTitle}
    >
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
          {titleExtra}
          {showTierBadge && tier && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded tracking-wide ${TIER_BADGE_CLASS[tier]}`}
              title={`Data tier: ${TIER_LABEL[tier]}`}
            >
              {TIER_LABEL[tier]}
            </span>
          )}
          {sourceDisabled && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide bg-amber-950/50 text-amber-300/90 border border-amber-800/40 cursor-help"
              title={nextWorkTitle}
              data-testid={panelId ? `panel-next-work-${panelId}` : 'panel-next-work'}
            >
              Next work
            </span>
          )}
          {statusBadge && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide ${statusBadge.className}`}
              title={sourceDisabled ? nextWorkTitle : undefined}
            >
              {statusBadge.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {freshness && (
            <span className={`text-[10px] mr-1 ${freshness.colorClass}`}>{freshness.statusText}</span>
          )}
          {/* Discreet API detail */}
          {(sourceInfo || panelTrace || panelId) && (
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              className="rounded p-1 text-slate-600 hover:bg-slate-700/60 hover:text-slate-300 transition-colors"
              title="API request details"
              aria-label={`API details for ${title}`}
              data-testid={panelId ? `panel-detail-${panelId}` : 'panel-detail'}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
          {/* Discreet refresh — re-runs parent category multi-source fetch */}
          {onRefresh && (
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={Boolean(refreshing)}
              className="rounded p-1 text-slate-600 hover:bg-slate-700/60 hover:text-amber-300 transition-colors disabled:opacity-40"
              title="Refresh this card (re-query category sources)"
              aria-label={`Refresh ${title}`}
              data-testid={panelId ? `panel-refresh-${panelId}` : 'panel-refresh'}
            >
              <svg
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      {emptyText || sourceDisabled ? (
        <div>
          <p className="text-slate-500 text-sm">
            {sourceDisabled
              ? emptyMessageForStatus('disabled', empty || 'No live public endpoint yet.')
              : emptyText}
          </p>
          {(derivedError || disabledReason) && (
            <p
              className="text-[10px] text-amber-500/80 mt-1.5 leading-relaxed"
              title={disabledReason || derivedError}
            >
              {disabledReason || derivedError}
            </p>
          )}
        </div>
      ) : (
        children
      )}
      {sourceInfo && (
        <div className="mt-3 pt-2 border-t border-slate-700/40">
          <button
            type="button"
            onClick={() => setShowSource(!showSource)}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showSource ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>Source: {sourceInfo.source}</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono">{sourceInfo.api}</span>
            {sourceHealth && sourceHealth !== 'healthy' && sourceHealth !== 'unknown' && (
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded ${HEALTH_BADGE[sourceHealth].className}`}>
                {HEALTH_BADGE[sourceHealth].text}
              </span>
            )}
          </button>
          {showSource && (
            <div className="mt-1.5 space-y-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 w-10 shrink-0">API</span>
                <span className="font-mono text-slate-400">{sourceInfo.api}</span>
                <span className="text-slate-600">by</span>
                <span className="text-slate-400">{sourceInfo.source}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 w-10 shrink-0">Docs</span>
                {sourceInfo.docs ? (
                  <a
                    href={sourceInfo.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-cyan-400/70 hover:text-cyan-300 break-all"
                  >
                    {sourceInfo.docs}
                  </a>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 w-10 shrink-0">Fetch</span>
                {sourceInfo.endpoint?.startsWith('http') ? (
                  <a
                    href={sourceInfo.endpoint}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-emerald-400/70 hover:text-emerald-300 break-all text-left"
                    title="Open API endpoint"
                  >
                    {sourceInfo.endpoint}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(sourceInfo.endpoint)}
                    className="font-mono text-emerald-400/70 hover:text-emerald-300 break-all text-left"
                  >
                    {sourceInfo.endpoint}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <PanelApiDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        panelTitle={title}
        panelId={panelId}
        trace={panelTrace}
      />
    </div>
  )
}
