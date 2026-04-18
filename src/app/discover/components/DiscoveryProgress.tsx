'use client'

import { DiscoveryState } from '../hooks/useDiscovery'

interface Props {
  state: DiscoveryState
}

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  high: { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-700/50', label: 'High confidence' },
  moderate: { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-700/50', label: 'Moderate confidence' },
  preliminary: { bg: 'bg-slate-800/50', text: 'text-slate-400', border: 'border-slate-600/50', label: 'Preliminary' },
}

export function DiscoveryProgress({ state }: Props) {
  if (state.status !== 'loading') return null

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          <span className="text-sm text-slate-300">{state.progressLabel}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${state.progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2 text-right">{state.progress}%</p>
      </div>
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-5xl mb-4">🔬</div>
      <h3 className="text-lg font-semibold text-slate-300 mb-2">No candidates found</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto">
        Try a different disease name or check the spelling. Some rare diseases may have limited data in public databases.
      </p>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-400 mb-1">Search Failed</h3>
        <p className="text-sm text-red-300/70 mb-3">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600/80 hover:bg-red-500 text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const style = CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.preliminary
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
      {style.label}
    </span>
  )
}

export function ScoreBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  )
}