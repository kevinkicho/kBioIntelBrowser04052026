'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { AtcClassification } from '@/lib/types'
import { atcDeepLink, atcLevelLabel, isWhoAtcCode } from '@/lib/api/atc'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

function rowHref(cls: AtcClassification): string {
  if (cls.url?.includes('atcddd.fhi.no') || cls.url?.includes('whocc.no')) {
    return cls.url
  }
  return atcDeepLink(cls.code)
}

export const AtcPanel = memo(function AtcPanel({
  classifications,
  panelId,
  lastFetched,
}: {
  classifications: AtcClassification[]
  panelId?: string
  lastFetched?: Date
}) {
  // Prefer WHO ATC codes only (API may still surface non-ATC in cached payloads)
  const items = useMemo(() => {
    const list = Array.isArray(classifications) ? classifications : []
    const filtered = list.filter((c) => isWhoAtcCode(c.code))
    return filtered.length > 0 ? filtered : list
  }, [classifications])

  const isEmpty = items.length === 0

  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<AtcClassification>((c) => c.code || c.name).map((o) => ({
        ...o,
        id: o.id.replace('name', 'code'),
        label: o.id.includes('asc') ? 'Code A–Z' : 'Code Z–A',
      })),
      ...alphaSortOptions<AtcClassification>((c) => c.name || ''),
      ...alphaSortOptions<AtcClassification>((c) =>
        atcLevelLabel(c.code, c.classType),
      ).map((o) => ({
        ...o,
        id: `level-${o.id}`,
        label: o.id.includes('asc') ? 'Level A–Z' : 'Level Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title="Drug Classification (WHO ATC)"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No ATC classification found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-2">
            WHO Anatomical Therapeutic Chemical codes. Open a row to view the class in the
            official ATC/DDD Index.
          </p>
          <FilterablePaginatedList
            items={items}
            getSearchText={(c) =>
              [c.code, c.name, c.classType, atcLevelLabel(c.code, c.classType)]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="code-asc"
            filterPlaceholder="Filter by code, name, or level…"
            getKey={(c, i) => `${c.code}-${i}`}
            pageSize={10}
            className="space-y-0"
            renderItem={(cls, index) => {
              const href = rowHref(cls)
              const level = atcLevelLabel(cls.code, cls.classType)
              const showHeader = index === 0
              return (
                <div>
                  {showHeader && (
                    <div
                      className="grid grid-cols-[6.5rem_minmax(0,1fr)_9.5rem_3.5rem] gap-x-3 px-2 py-1.5 mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                      role="row"
                    >
                      <span>Code</span>
                      <span>Class name</span>
                      <span>Level</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Open ${cls.code} — ${cls.name || 'ATC class'} in WHO ATC/DDD Index`}
                    onClick={() =>
                      onDeepLinkClick('atc', href, { panelId: 'atc', label: cls.code })
                    }
                    className="grid grid-cols-[6.5rem_minmax(0,1fr)_9.5rem_3.5rem] items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group gap-x-3"
                  >
                    <span className="text-xs font-mono font-medium text-teal-300 group-hover:text-teal-200 truncate">
                      {cls.code || '—'}
                    </span>
                    <span className="text-sm text-slate-200 group-hover:text-cyan-200 truncate min-w-0">
                      {cls.name || '—'}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate" title={level}>
                      {level}
                    </span>
                    <span className="text-xs text-cyan-400 group-hover:text-cyan-300 text-right whitespace-nowrap">
                      View ↗
                    </span>
                  </a>
                </div>
              )
            }}
          />
        </>
      )}
    </Panel>
  )
})
