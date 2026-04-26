'use client'

import { getAxis } from '@/lib/hypothesis/axes'
import { deleteHypothesis } from '@/lib/hypothesis/savedHypotheses'
import type { Hypothesis } from '@/lib/hypothesis/types'

interface Props {
  hypotheses: Hypothesis[]
  onLoad: (h: Hypothesis) => void
  onChange: () => void
}

function summarize(h: Hypothesis): string {
  return h.filters
    .map(f => {
      const label = getAxis(f.axis)?.label ?? f.axis
      return `${label}: ${f.value}`
    })
    .join(' • ')
}

export function SavedHypotheses({ hypotheses, onLoad, onChange }: Props) {
  if (hypotheses.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Saved hypotheses
      </h2>
      <div className="flex flex-wrap gap-2">
        {hypotheses.map(h => (
          <div
            key={h.id}
            className="group flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg pl-3 pr-1 py-1 hover:border-indigo-600/50 transition-colors"
          >
            <button
              type="button"
              onClick={() => onLoad(h)}
              className="text-left"
              title={summarize(h)}
            >
              <span className="text-sm text-slate-200 hover:text-indigo-300 transition-colors">
                {h.name}
              </span>
              <span className="text-[10px] text-slate-500 ml-2">
                {h.filters.length} filter{h.filters.length === 1 ? '' : 's'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                deleteHypothesis(h.id)
                onChange()
              }}
              className="opacity-40 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all px-1.5 py-0.5 text-xs"
              title="Delete hypothesis"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
