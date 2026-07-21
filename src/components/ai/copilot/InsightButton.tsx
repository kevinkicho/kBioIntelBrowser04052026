"use client"

import { AiWhyTooltip } from '@/components/ai/AiWhyTooltip'
import { buildInsightModeWhy } from '@/lib/ai/aiWhyTooltip'

const MODE_HINTS: Record<string, string> = {
  brief: 'Short executive synthesis grounded in retrieved free-API evidence.',
  safety: 'Safety-focused insight from AE / recall / risk panels when loaded.',
  gap: 'What free-public evidence is thin or missing for this entity.',
  auto: 'Auto-pick high-signal facets from currently loaded evidence.',
  mechanism: 'Mechanism / target narrative from ChEMBL, DGIdb, Open Targets, etc.',
  hypothesis: 'Research hypothesis seeds — not clinical predictions.',
  competitive: 'Competitive landscape from free public competitive / indication data.',
  repurpose: 'Repurposing scan using indications, targets, and literature bags.',
  compare: 'Cross-molecule compare using session-prior molecules + current evidence.',
  patent: 'Prior-art style query from free patent / literature surfaces.',
  next: 'Suggest next research actions from current evidence density and gaps.',
}

export function InsightButton({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  icon: string
}) {
  const icons: Record<string, string> = {
    brief: '📋',
    safety: '🛡️',
    gap: '🔍',
    auto: '✨',
    mechanism: '🎯',
    hypothesis: '💡',
    competitive: '📊',
    repurpose: '🔄',
    compare: '⚗️',
    patent: '📜',
    next: '➡️',
  }
  const why = buildInsightModeWhy(label, MODE_HINTS[icon])
  return (
    <div className="flex items-stretch gap-0.5 min-w-0">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={why.summary}
        className="flex flex-1 min-w-0 items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-medium bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 hover:border-indigo-700/40 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
      >
        <span>{icons[icon] || '•'}</span>
        <span className="truncate">{label}</span>
      </button>
      <div className="flex items-center">
        <AiWhyTooltip why={why} testId={`insight-why-${icon}`} label="why?" align="right" />
      </div>
    </div>
  )
}
