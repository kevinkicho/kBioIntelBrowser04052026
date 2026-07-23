'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { OpenAirePublication } from '@/lib/api/openaire'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const OpenAirePublicationsPanel = memo(function OpenAirePublicationsPanel({
  publications,
  panelId,
  lastFetched,
}: {
  publications: OpenAirePublication[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(publications) ? publications : []
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<OpenAirePublication>((p) => p.year || '').map((o) => ({
        ...o,
        id: `year-${o.id}`,
        label: o.id.includes('asc') ? 'Year A–Z' : 'Year Z–A',
      })),
      ...alphaSortOptions<OpenAirePublication>((p) => p.title || ''),
    ],
    [],
  )

  return (
    <Panel
      title={
        list.length > 0
          ? `OpenAIRE publications (${list.length})`
          : 'OpenAIRE publications'
      }
      panelId={panelId}
      lastFetched={lastFetched}
      help="Free OpenAIRE research products search (publications). Complements Europe PMC / OpenAlex."
      empty={
        list.length === 0
          ? 'No OpenAIRE publications matched this name (free public Graph API).'
          : undefined
      }
    >
      {list.length > 0 && (
        <>
          <FilterablePaginatedList
            items={list}
            getSearchText={(p) =>
              [p.title, p.doi, p.year, p.publisher].filter(Boolean).join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter publications…"
            getKey={(p, i) => `${p.id}-${i}`}
            renderItem={(p) => (
              <div
                className="py-2 border-b border-slate-700/60 last:border-0"
                data-testid="openaire-pub-row"
              >
                <p className="text-sm text-slate-100 leading-snug">{p.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {[p.year, p.publisher, p.doi].filter(Boolean).join(' · ')}
                </p>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-[10px] text-indigo-400 hover:underline"
                  onClick={() =>
                    onDeepLinkClick('other', p.url, {
                      panelId: panelId || 'openaire-publications',
                      label: p.doi || p.title.slice(0, 40),
                    })
                  }
                >
                  Open record
                </a>
              </div>
            )}
          />
        </>
      )}
    </Panel>
  )
})
