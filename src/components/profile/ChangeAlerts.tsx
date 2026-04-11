'use client'

import { useState } from 'react'
import type { ChangeItem } from '@/lib/changeDetection'
import { getSnapshotAge } from '@/lib/changeDetection'

interface Props {
  changes: ChangeItem[]
  cid: number
}

export function ChangeAlerts({ changes, cid }: Props) {
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
        {changes.map((c, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
              c.type === 'new'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : c.type === 'removed'
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}
          >
            {c.type === 'new' ? '🆕' : c.type === 'removed' ? '📉' : '🔄'}
            {c.count} {c.type} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
