'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TdlBadge } from '@/components/discover/TdlBadge'

export interface TargetPinPanelProps {
  targets: string[]
  onRemove?: (symbol: string) => void
  onClear?: () => void
  /** Show help when waiting for disease query */
  waitingForDisease?: boolean
  className?: string
}

/**
 * Polished pinned-targets panel for Discover (PR15 + V2-10 TDL).
 */
export function TargetPinPanel({
  targets,
  onRemove,
  onClear,
  waitingForDisease = false,
  className = '',
}: TargetPinPanelProps) {
  const [tdlMap, setTdlMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (targets.length === 0) {
      setTdlMap({})
      return
    }
    let cancelled = false
    void fetch(`/api/pharos/tdl?symbols=${encodeURIComponent(targets.join(','))}`)
      .then((r) => r.json())
      .then((data: { tdl?: Record<string, string> }) => {
        if (!cancelled && data.tdl) setTdlMap(data.tdl)
      })
      .catch(() => {
        if (!cancelled) setTdlMap({})
      })
    return () => {
      cancelled = true
    }
  }, [targets])

  if (targets.length === 0) return null

  return (
    <div
      className={`mb-4 rounded-xl border border-emerald-800/40 bg-gradient-to-r from-emerald-950/40 to-slate-900/40 px-4 py-3 ${className}`}
      data-testid="discover-pinned-targets"
      role="region"
      aria-label="Pinned gene targets"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-900/60 text-[10px] text-emerald-300">
            ⊕
          </span>
          <span className="text-xs font-semibold text-emerald-200/90">
            Pinned targets
          </span>
          <span className="text-[10px] text-slate-500">
            ({targets.length}) — used to bias gene→drug gather when ranking
          </span>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-slate-500 hover:text-slate-300 underline"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {targets.map((symbol) => (
          <span
            key={symbol}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-800/50 bg-emerald-900/40 pl-2 pr-1 py-0.5"
          >
            <Link
              href={`/gene/${encodeURIComponent(symbol)}`}
              className="text-xs font-mono font-semibold text-emerald-300 hover:text-emerald-200"
              title={`Open ${symbol} gene page`}
            >
              {symbol}
            </Link>
            <TdlBadge tdl={tdlMap[symbol.toUpperCase()]} />
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(symbol)}
                className="rounded px-1 text-[10px] text-emerald-600 hover:bg-emerald-900/80 hover:text-emerald-200"
                aria-label={`Unpin ${symbol}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {waitingForDisease && (
        <p className="mt-2 text-[11px] text-slate-500">
          Enter a disease above to rank candidates for these targets. Pins survive
          disease confirm via the URL <code className="text-slate-600">targets=</code> param.
        </p>
      )}
    </div>
  )
}
