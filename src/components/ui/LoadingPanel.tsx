export function LoadingPanel({ title }: { title: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 animate-pulse">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">{title}</h3>
      <div className="space-y-2">
        <div className="h-4 bg-slate-700 rounded w-3/4" />
        <div className="h-4 bg-slate-700 rounded w-1/2" />
        <div className="h-4 bg-slate-700 rounded w-2/3" />
      </div>
    </div>
  )
}
