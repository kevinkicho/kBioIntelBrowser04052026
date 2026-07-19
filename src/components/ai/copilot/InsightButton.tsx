"use client"

export function InsightButton({ label, onClick, disabled, icon }: { label: string; onClick: () => void; disabled: boolean; icon: string }) {
  const icons: Record<string, string> = { brief: '📋', safety: '🛡️', gap: '🔍', auto: '✨', mechanism: '🎯', hypothesis: '💡', competitive: '📊', repurpose: '🔄', compare: '⚗️', patent: '📜', next: '➡️' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-medium bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 hover:border-indigo-700/40 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
    >
      <span>{icons[icon] || '•'}</span>
      {label}
    </button>
  )
}
