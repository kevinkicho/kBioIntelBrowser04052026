'use client'

/**
 * Count-diff signal chips on the project board.
 * Styled tooltip explains deterministic algorithm (not AI); link opens the matching profile panel.
 */

import { useId, useState } from 'react'
import Link from 'next/link'
import type { SignalItem } from '@/lib/signals'
import { explainSignal } from '@/lib/signals/explainSignal'
import { buildMoleculePanelDeepLink } from '@/lib/signals/deepLink'
import { STYLED_TOOLTIP_Z } from '@/components/ui/StyledTooltip'

interface SignalBadgesProps {
  signals: SignalItem[]
  /** Compact single-line for table cells */
  compact?: boolean
  className?: string
  /** Molecule name for tooltip context */
  moleculeName?: string
  /** PubChem CID — rebuilds stable panel deep links (tab + hash) */
  cid?: number | null
  /** Human age of baseline snapshot when known */
  snapshotAge?: string | null
  projectId?: string | null
}

/**
 * Count-diff badges that deep-link to molecule panel anchors (PR14 DoD).
 * Not cosmetic: each badge is a real navigation target with explainable method.
 */
export function SignalBadges({
  signals,
  compact = false,
  className = '',
  moleculeName,
  cid,
  snapshotAge,
  projectId,
}: SignalBadgesProps) {
  if (!signals.length) return null

  return (
    <div
      className={`flex flex-wrap gap-1 ${className}`}
      role="list"
      aria-label="Data change signals"
    >
      {signals.map((s) => (
        <SignalChip
          key={`${s.key}-${s.type}-${s.count}-${s.panelId}`}
          signal={s}
          compact={compact}
          moleculeName={moleculeName}
          cid={cid}
          snapshotAge={snapshotAge}
          projectId={projectId}
        />
      ))}
    </div>
  )
}

function SignalChip({
  signal: s,
  compact,
  moleculeName,
  cid,
  snapshotAge,
  projectId,
}: {
  signal: SignalItem
  compact: boolean
  moleculeName?: string
  cid?: number | null
  snapshotAge?: string | null
  projectId?: string | null
}) {
  const uid = useId()
  const tipId = `${uid}-tip`
  const [open, setOpen] = useState(false)
  const explain = explainSignal(s, { moleculeName, snapshotAge })

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

  // Always rebuild stable in-app deep link when CID known (tab + panel + hash)
  let href: string | null = null
  if (cid != null && cid > 0 && s.panelId) {
    try {
      href = buildMoleculePanelDeepLink(cid, s.panelId, { projectId })
    } catch {
      href = null
    }
  } else if (s.href?.startsWith('/molecule/')) {
    href = s.href
  }

  return (
    <span
      className="relative inline-flex"
      role="listitem"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {href ? (
        <Link
          href={href}
          aria-describedby={open ? tipId : undefined}
          aria-label={`${explain.headline}. Opens molecule profile panel ${s.panelId}. Not AI ranking.`}
          className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${tone}`}
          data-testid="signal-chip-link"
          data-panel-id={s.panelId}
        >
          <span aria-hidden>{s.type === 'new' ? '🆕' : s.type === 'removed' ? '📉' : '🔄'}</span>
          {label}
          <span className="ml-0.5 text-[9px] opacity-60" aria-hidden>
            ↗
          </span>
        </Link>
      ) : (
        <span
          className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium cursor-default ${tone} opacity-80`}
          aria-describedby={open ? tipId : undefined}
          data-testid="signal-chip-nolink"
        >
          <span aria-hidden>{s.type === 'new' ? '🆕' : s.type === 'removed' ? '📉' : '🔄'}</span>
          {label}
        </span>
      )}

      {open && (
        <span
          id={tipId}
          role="tooltip"
          data-testid="signal-chip-tooltip"
          style={{ zIndex: STYLED_TOOLTIP_Z }}
          className="pointer-events-none absolute left-0 bottom-full mb-1.5 w-72 max-w-[min(18rem,90vw)] rounded-lg border border-slate-600 bg-slate-950 p-2.5 shadow-xl shadow-black/50 text-left"
        >
          <span className="block text-[10px] font-semibold text-amber-200/95">
            {explain.headline}
          </span>
          <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Free-API count signal · not AI ranking
          </span>

          <TipSection title="Why it is showing">{explain.whyShowing}</TipSection>
          <TipSection title="What it points at">{explain.pointsAt}</TipSection>
          <TipSection title="Algorithm">{explain.algorithm}</TipSection>
          <TipSection title="Analysis method">{explain.analysis}</TipSection>
          <TipSection title="Where click goes">{explain.destination}</TipSection>
          <span className="mt-1.5 block text-[9px] leading-snug text-slate-600">
            {explain.notAi}
          </span>
          {href && (
            <span className="mt-1 block font-mono text-[8px] text-slate-600 break-all">
              {href}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

function TipSection({ title, children }: { title: string; children: string }) {
  return (
    <span className="mt-1.5 block">
      <span className="block text-[9px] font-semibold text-indigo-300/90">{title}</span>
      <span className="block text-[10px] leading-snug text-slate-300 mt-0.5">{children}</span>
    </span>
  )
}
