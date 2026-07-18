'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { AtcClassification } from '@/lib/types'
import { alphaSortOptions } from '@/lib/listControls'

export const AtcPanel = memo(function AtcPanel({ classifications, panelId, lastFetched }: { classifications: AtcClassification[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = classifications.length === 0
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<AtcClassification>((c) => c.code || c.name).map((o) => ({
        ...o,
        id: o.id.replace('name', 'code'),
        label: o.id.includes('asc') ? 'Code A–Z' : 'Code Z–A',
      })),
      ...alphaSortOptions<AtcClassification>((c) => c.name || ''),
    ],
    [],
  )

  return (
    <Panel
      title="Drug Classification (WHO ATC)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No ATC classification found for this molecule." : undefined}
    >
      {!isEmpty && (
        <FilterablePaginatedList
          items={classifications}
          getSearchText={(c) => [c.code, c.name, c.classType].filter(Boolean).join(' ')}
          sortOptions={sortOptions}
          defaultSortId="code-asc"
          filterPlaceholder="Filter classifications…"
          getKey={(c, i) => `${c.code}-${i}`}
          className="space-y-2"
          renderItem={(cls) => (
            <div className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0">
              <span className="text-xs font-mono bg-teal-900/40 text-teal-300 border border-teal-700/30 px-2 py-0.5 rounded shrink-0">
                {cls.code}
              </span>
              <span className="text-sm text-slate-200">{cls.name}</span>
              <span className="text-xs text-slate-500 ml-auto">{cls.classType}</span>
            </div>
          )}
        />
      )}
    </Panel>
  )
})
