"use client"

import { useMemo, useState } from 'react'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'
import {
  filterGaps,
  type RetrievalGap,
  type RetrievalSnapshot,
} from '@/lib/ai/retrievalMonitor'

function gapDotClass(reason: RetrievalGap['reason']): string {
  if (reason === 'error') return 'bg-red-400'
  if (reason === 'timeout') return 'bg-orange-400'
  if (reason === 'empty') return 'bg-amber-400'
  if (reason === 'pending') return 'bg-slate-500'
  return 'bg-slate-600'
}

function StatusDot({ status }: { status: CategoryLoadState }) {
  const color = status === 'loaded'
    ? 'bg-emerald-400'
    : status === 'loading'
    ? 'bg-amber-400 animate-pulse'
    : status === 'error'
    ? 'bg-red-400'
    : 'bg-slate-600'
  return <span className={`w-2 h-2 rounded-full ${color}`} />
}

export function MonitorTab({
  snapshot,
  onRetryCategory,
  onLoadCategory,
  onOpenPanel,
}: {
  snapshot: RetrievalSnapshot
  onRetryCategory?: (categoryId: CategoryId) => void
  onLoadCategory?: (categoryId: CategoryId) => void
  onOpenPanel?: (panelId: string, categoryId: CategoryId) => void
}) {
  const [gapFilter, setGapFilter] = useState<
    'all' | 'empty' | 'failed' | 'pending' | 'actionable'
  >('actionable')
  const filteredGaps = useMemo(
    () => filterGaps(snapshot.gaps, gapFilter),
    [snapshot.gaps, gapFilter],
  )
  const failedCount = snapshot.totalApisErrored + snapshot.totalApisTimeout
  const pct = Math.round(snapshot.overallCompleteness * 100)

  return (
    <div className="space-y-3" data-testid="copilot-monitor">
      <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Data retrieval
          </span>
          <span className="text-[10px] text-slate-500" title="Share of terminal outcomes with data">
            {pct}% with data
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div>
            <p className="text-base font-bold text-emerald-400">{snapshot.totalApisSucceeded}</p>
            <p className="text-[8px] text-slate-500 uppercase">With data</p>
          </div>
          <div>
            <p className="text-base font-bold text-amber-400">{snapshot.totalApisEmpty}</p>
            <p className="text-[8px] text-slate-500 uppercase">Empty</p>
          </div>
          <div>
            <p className="text-base font-bold text-red-400">{failedCount}</p>
            <p className="text-[8px] text-slate-500 uppercase">Failed</p>
          </div>
          <div>
            <p className="text-base font-bold text-slate-400">{snapshot.totalApisPending}</p>
            <p className="text-[8px] text-slate-500 uppercase">Pending</p>
          </div>
        </div>
        <p className="mt-2 text-[9px] text-slate-600 leading-relaxed">
          Empty = retrieved, no rows (honest). Failed = timeout/error (retry). Pending = not loaded
          yet.
        </p>
      </div>

      {Object.entries(snapshot.categories).map(([catId, cat]) => (
        <div
          key={catId}
          className="bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-800/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-slate-300 truncate">
              {cat.label || catId}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-slate-500">
                {cat.successPanels}/{cat.totalPanels}
              </span>
              <StatusDot status={cat.loadState} />
              {(cat.errorPanels > 0 || cat.timeoutPanels > 0 || cat.loadState === 'error') &&
                onRetryCategory && (
                  <button
                    type="button"
                    onClick={() => onRetryCategory(catId as CategoryId)}
                    className="text-[9px] text-amber-300 hover:text-amber-200 underline"
                    data-testid={`monitor-retry-${catId}`}
                  >
                    Retry
                  </button>
                )}
              {cat.loadState === 'idle' && onLoadCategory && (
                <button
                  type="button"
                  onClick={() => onLoadCategory(catId as CategoryId)}
                  className="text-[9px] text-indigo-300 hover:text-indigo-200 underline"
                >
                  Load
                </button>
              )}
            </div>
          </div>
          {(cat.loadState === 'loaded' || cat.loadState === 'error') && (
            <div className="mt-1.5 w-full bg-slate-800 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  cat.completeness >= 0.8
                    ? 'bg-emerald-500'
                    : cat.completeness >= 0.4
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.round(cat.completeness * 100)}%` }}
              />
            </div>
          )}
          {(cat.emptyPanels > 0 || cat.errorPanels > 0 || cat.timeoutPanels > 0) && (
            <p className="mt-1 text-[9px] text-slate-600">
              {cat.emptyPanels > 0 && <span className="text-amber-500/80">{cat.emptyPanels} empty </span>}
              {cat.timeoutPanels > 0 && (
                <span className="text-orange-400/80">{cat.timeoutPanels} timeout </span>
              )}
              {cat.errorPanels > 0 && <span className="text-red-400/80">{cat.errorPanels} error</span>}
            </p>
          )}
        </div>
      ))}

      <div className="bg-amber-950/20 rounded-lg p-3 border border-amber-800/30">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            Gaps ({filteredGaps.length}/{snapshot.gaps.length})
          </p>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {(
            [
              ['actionable', 'Actionable'],
              ['failed', 'Failed'],
              ['empty', 'Empty'],
              ['pending', 'Pending'],
              ['all', 'All'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setGapFilter(id)}
              className={`text-[9px] px-1.5 py-0.5 rounded border ${
                gapFilter === id
                  ? 'border-amber-600/60 bg-amber-900/40 text-amber-200'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
              data-testid={`monitor-gap-filter-${id}`}
            >
              {label}
            </button>
          ))}
        </div>
        {filteredGaps.length === 0 ? (
          <p className="text-[10px] text-slate-500">No gaps in this filter.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filteredGaps.slice(0, 40).map((gap, i) => (
              <div
                key={`${gap.panelKey}-${i}`}
                className="flex items-start gap-2 group"
                title={gap.detail}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${gapDotClass(gap.reason)}`}
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={!gap.panelId || !onOpenPanel}
                    onClick={() => {
                      if (gap.panelId && onOpenPanel) {
                        onOpenPanel(gap.panelId, gap.categoryId)
                      }
                    }}
                    className="text-[10px] text-slate-300 text-left hover:text-cyan-300 disabled:hover:text-slate-300 truncate block w-full"
                  >
                    {gap.title}
                  </button>
                  <p className="text-[9px] text-slate-600 truncate">{gap.detail}</p>
                </div>
                <span className="text-[8px] text-slate-600 uppercase shrink-0">{gap.reason}</span>
                {gap.actionable &&
                  (gap.reason === 'error' || gap.reason === 'timeout') &&
                  onRetryCategory && (
                    <button
                      type="button"
                      onClick={() => onRetryCategory(gap.categoryId)}
                      className="text-[8px] text-amber-400 hover:text-amber-200 shrink-0"
                    >
                      Retry
                    </button>
                  )}
                {gap.reason === 'pending' && onLoadCategory && (
                  <button
                    type="button"
                    onClick={() => onLoadCategory(gap.categoryId)}
                    className="text-[8px] text-indigo-400 hover:text-indigo-200 shrink-0"
                  >
                    Load
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {snapshot.anomalies.length > 0 && (
        <div className="bg-red-950/20 rounded-lg p-3 border border-red-800/30">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">
            Anomalies
          </p>
          {snapshot.anomalies.map((a, i) => (
            <p key={i} className="text-[10px] text-red-300/70 mb-1">
              {a.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
