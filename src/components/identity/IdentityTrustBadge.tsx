'use client'

import {
  assessIdentityTrust,
  type IdentityKeys,
  type IdentityTrust,
  type IdentityTrustLevel,
} from '@/lib/domain'

/**
 * Visual styles for IdentityTrust levels.
 * Not “confidence” — structure/xref quality only (§3.2).
 */
export const IDENTITY_TRUST_STYLES: Record<
  IdentityTrustLevel,
  { bg: string; text: string; border: string; label: string; short: string }
> = {
  high: {
    bg: 'bg-emerald-900/30',
    text: 'text-emerald-300',
    border: 'border-emerald-700/50',
    label: 'Identity high',
    short: 'High',
  },
  medium: {
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-300',
    border: 'border-cyan-700/50',
    label: 'Identity medium',
    short: 'Medium',
  },
  low: {
    bg: 'bg-amber-900/30',
    text: 'text-amber-300',
    border: 'border-amber-700/50',
    label: 'Identity low',
    short: 'Low',
  },
  unresolved: {
    bg: 'bg-slate-800/60',
    text: 'text-slate-400',
    border: 'border-slate-600/50',
    label: 'Identity unresolved',
    short: 'Unresolved',
  },
}

export function identityTrustLabel(level: IdentityTrustLevel, compact = false): string {
  const s = IDENTITY_TRUST_STYLES[level]
  return compact ? s.short : s.label
}

export interface IdentityTrustBadgeProps {
  /** Explicit trust level (preferred when already assessed). */
  level?: IdentityTrust
  /** Optional keys — reassessed for level + tooltip reasons when level omitted. */
  keys?: IdentityKeys
  /** Override tooltip reasons (e.g. from prior assessment). */
  reasons?: string[]
  /** Compact: “High” vs “Identity high”. */
  compact?: boolean
  className?: string
  /** Hide title tooltip when false. Default true. */
  showTitle?: boolean
}

/**
 * Badge for molecule/disease/target structure-identity quality.
 * Uses domain `assessIdentityTrust` when only keys are provided.
 */
export function IdentityTrustBadge({
  level,
  keys,
  reasons,
  compact = false,
  className = '',
  showTitle = true,
}: IdentityTrustBadgeProps) {
  const assessment = keys ? assessIdentityTrust(keys) : null
  const trust: IdentityTrustLevel = level ?? assessment?.level ?? 'unresolved'
  const style = IDENTITY_TRUST_STYLES[trust]
  const tipParts = reasons ?? assessment?.reasons ?? []
  const title = tipParts.length
    ? `Identity trust (${trust}): ${tipParts.join(' · ')}`
    : `Identity trust: ${trust} — structure/xref quality, not evidence breadth`

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${className}`}
      title={showTitle ? title : undefined}
      data-identity-trust={trust}
      data-testid="identity-trust-badge"
    >
      <span className="opacity-70" aria-hidden>
        ◆
      </span>
      {compact ? style.short : style.label}
    </span>
  )
}
