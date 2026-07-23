'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { DescriptionTip } from '@/components/ui/HelperTip'
import type { ProteinDomain } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

const typeBadgeColors: Record<string, string> = {
  family: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
  domain: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
  repeat: 'bg-violet-900/40 text-violet-300 border-violet-700/30',
  site: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
}

const defaultBadge = 'bg-slate-700/60 text-slate-300 border-slate-600/30'

export const InterProPanel = memo(function InterProPanel({
  domains,
  panelId,
  lastFetched,
}: {
  domains: ProteinDomain[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(domains) ? domains : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => alphaSortOptions<ProteinDomain>((d) => d.name || d.domainName || ''),
    [],
  )

  return (
    <Panel
      title="Protein Domains (InterPro)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No protein domain data found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(d) =>
            [d.name, d.domainName, d.type, d.description, d.domainId, d.source]
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="name-asc"
          filterPlaceholder="Filter domains…"
          getKey={(domain, i) => `${domain.domainId || domain.name}-${i}`}
          renderItem={(domain) => (
            <div className="py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs border px-2 py-0.5 rounded ${typeBadgeColors[domain.type.toLowerCase()] ?? defaultBadge}`}
                  >
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

              <DescriptionTip text={domain.description} className="mt-2" />
            </div>
          )}
        />
      )}
    </Panel>
  )
})
