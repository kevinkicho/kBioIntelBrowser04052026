'use client'

import Link from 'next/link'
import type { SignalItem } from '@/lib/signals'

interface SignalBadgesProps {
  signals: SignalItem[]
  /** Compact single-line for table cells */
  compact?: boolean
  className?: string
}

/**
 * Count-diff badges that deep-link to molecule panel anchors (PR14 DoD).
 * Not cosmetic: each badge is a real navigation target.
 */
export function SignalBadges({ signals, compact = false, className = '' }: SignalBadgesProps) {
  if (!signals.length) return null

  return (
    <div
      className={`flex flex-wrap gap-1 ${className}`}
      role="list"
      aria-label="Data change signals"
    >
      {signals.map((s) => {
        const tone =
          s.type === 'new'
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
            : s.type === 'removed'
              ? 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
        const prefix = s.type === 'new' ? '+' : s.type === 'removed' ? '−' : 'Δ'
        const label = compact
          ? `${prefix}${s.count} ${s.label}`
          : `${prefix}${s.count} ${s.type} ${s.label}`

        return (
          <Link
            key={`${s.key}-${s.type}-${s.count}`}
            href={s.href}
            role="listitem"
            title={`Open ${s.label} panel on molecule profile`}
            className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${tone}`}
          >
            <span aria-hidden>{s.type === 'new' ? '🆕' : s.type === 'removed' ? '📉' : '🔄'}</span>
            {label}
            <span className="ml-0.5 text-[9px] opacity-60" aria-hidden>
              →
            </span>
          </Link>
        )
      })}
    </div>
  )
}
