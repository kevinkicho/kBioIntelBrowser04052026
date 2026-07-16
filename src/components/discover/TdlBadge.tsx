'use client'

/** Pharos Target Development Level badge (V2-10). Hidden when tdl empty. */

const TDL_STYLES: Record<string, string> = {
  Tclin: 'border-emerald-700/50 bg-emerald-900/40 text-emerald-300',
  Tchem: 'border-cyan-700/50 bg-cyan-900/40 text-cyan-300',
  Tbio: 'border-amber-700/50 bg-amber-900/40 text-amber-300',
  Tdark: 'border-slate-600 bg-slate-800/60 text-slate-400',
}

export function TdlBadge({ tdl, className = '' }: { tdl?: string | null; className?: string }) {
  if (!tdl || !tdl.trim()) return null
  const key = tdl.trim()
  const style = TDL_STYLES[key] ?? 'border-slate-700 bg-slate-800/50 text-slate-400'
  return (
    <span
      className={`inline-flex shrink-0 rounded border px-1 py-0.5 text-[9px] font-medium ${style} ${className}`}
      title={`Pharos Target Development Level: ${key}`}
      data-testid="pharos-tdl-badge"
      data-tdl={key}
    >
      {key}
    </span>
  )
}
