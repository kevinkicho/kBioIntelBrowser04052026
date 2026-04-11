import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { ProteinDomain } from '@/lib/types'

const typeBadgeColors: Record<string, string> = {
  family: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
  domain: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
  repeat: 'bg-violet-900/40 text-violet-300 border-violet-700/30',
  site: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
}

const defaultBadge = 'bg-slate-700/60 text-slate-300 border-slate-600/30'

export const InterProPanel = memo(function InterProPanel({ domains, panelId, lastFetched }: { domains: ProteinDomain[], panelId?: string, lastFetched?: Date }) {
  if (domains.length === 0) {
    return (
      <Panel title="Protein Domains (InterPro)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No protein domain data found for this molecule.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Protein Domains (InterPro)" panelId={panelId} lastFetched={lastFetched}>
      <PaginatedList className="space-y-3">
        {domains.map((domain, i) => (
          <div key={i} className="py-3 border-b border-slate-700 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs border px-2 py-0.5 rounded ${typeBadgeColors[domain.type.toLowerCase()] ?? defaultBadge}`}>
                  {domain.type}
                </span>
                <p className="font-semibold text-slate-100 text-sm">{domain.name}</p>
              </div>
              <a
                href={domain.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0"
              >
                InterPro →
              </a>
            </div>

            {domain.description && (
              <p className="text-xs text-slate-400 mt-2 line-clamp-2">{domain.description}</p>
            )}
          </div>
        ))}
      </PaginatedList>
    </Panel>
  )
})
