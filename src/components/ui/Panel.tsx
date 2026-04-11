import { getFreshnessStatus } from '@/lib/dataFreshness'

interface PanelProps {
  title: string
  panelId?: string
  lastFetched?: Date
  children: React.ReactNode
  className?: string
}

export function Panel({ title, panelId, lastFetched, children, className = '' }: PanelProps) {
  const freshness = panelId && lastFetched ? getFreshnessStatus(panelId, lastFetched) : null

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-xl p-5 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {freshness && (
          <span className={`text-xs ${freshness.colorClass}`}>
            {freshness.statusText}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
