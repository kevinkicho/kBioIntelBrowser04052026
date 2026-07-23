'use client'

import { useState } from 'react'
import type { ChangeItem } from '@/lib/changeDetection'
import { getSnapshotAge } from '@/lib/changeDetection'
import { buildMoleculePanelDeepLink } from '@/lib/signals'
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

interface Props {
  changes: ChangeItem[]
  cid: number
  /** Optional project context for deep links */
  projectId?: string | null
}

/**
 * Profile change banner. Each chip deep-links to the affected panel (PR14 DoD).
 */
export function ChangeAlerts({ changes, cid, projectId }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || changes.length === 0) return null

  const age = getSnapshotAge(cid)

  return (
    <div className="mb-4 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm font-semibold">🔔 Changes Detected</span>
          {age && <span className="text-[10px] text-slate-500">since last visit ({age})</span>}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Dismiss
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {changes.map((c, i) => {
          const panelId = c.panelId
          const href = panelId
            ? buildMoleculePanelDeepLink(cid, panelId, { projectId })
            : undefined
          const chipClass = `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            c.type === 'new'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
              : c.type === 'removed'
                ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
          }`
          const content = (
            <>
              {c.type === 'new' ? '🆕' : c.type === 'removed' ? '📉' : '🔄'}
              {c.count} {c.type} {c.label}
              {href && (
                <span className="text-[9px] opacity-60" aria-hidden>
                  →
                </span>
              )}
            </>
          )

          if (href) {
            return (
              <StyledTooltip key={i} content={`Jump to ${c.label} panel`}>
                <a href={href} className={chipClass}>
                  {content}
                </a>
              </StyledTooltip>
            )
          }

          return (
            <span key={i} className={chipClass}>
              {content}
            </span>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
        <span>Change chips</span>
        <HelperTip
          content="Click a chip to open the corresponding data panel. Counts reflect local snapshot diffs, not clinical alerts."
          label="About change alerts"
          testId="change-alerts-help"
        />
      </div>
    </div>
  )
}
