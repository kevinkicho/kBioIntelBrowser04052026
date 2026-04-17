'use client'

import type { DataLoadStatus, SectionStatus } from '@/lib/dataStatus'

interface Props {
  status: SectionStatus | undefined
  label: string
  loading?: boolean
  count?: number
}

const STATUS_CONFIG: Record<DataLoadStatus, { icon: string; text: string; className: string }> = {
  loaded: { icon: '', text: '', className: '' },
  empty: {
    icon: '∅',
    text: 'No data available',
    className: 'text-slate-500 bg-slate-800/30 border-slate-700/50',
  },
  error: {
    icon: '⚠',
    text: 'Unable to load data',
    className: 'text-amber-400 bg-amber-900/10 border-amber-800/30',
  },
}

export function DataStatus({ status, label, loading, count }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
        <div className="w-3 h-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Loading {label}...</span>
      </div>
    )
  }

  if (!status || status.status === 'loaded') return null

  const config = STATUS_CONFIG[status.status]

  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-lg border ${config.className}`}>
      <span className="text-sm">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{config.text}</p>
        {status.status === 'error' && status.error && (
          <p className="text-[10px] mt-0.5 opacity-70 truncate">{status.error}</p>
        )}
        {status.status === 'empty' && count !== undefined && (
          <p className="text-[10px] mt-0.5 opacity-70">0 {label} found for this gene</p>
        )}
      </div>
    </div>
  )
}

export function EmptySection({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
      <span className="text-sm text-slate-500">∅</span>
      <div>
        <p className="text-xs font-medium text-slate-500">No {label} available</p>
        {hint && <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>}
      </div>
    </div>
  )
}

export function ErrorSection({ label, error }: { label: string; error?: string }) {
  return (
    <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-amber-900/10 border border-amber-800/30">
      <span className="text-sm">⚠</span>
      <div>
        <p className="text-xs font-medium text-amber-400">Unable to load {label}</p>
        {error && <p className="text-[10px] text-amber-500/70 mt-0.5 truncate">{error}</p>}
      </div>
    </div>
  )
}