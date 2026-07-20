'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { OpenAireProject } from '@/lib/api/openaire'
import { alphaSortOptions, dateSortOptions, numberSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const OpenAireProjectsPanel = memo(function OpenAireProjectsPanel({
  projects,
  panelId,
  lastFetched,
}: {
  projects: OpenAireProject[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(projects) ? projects : []
  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<OpenAireProject>((p) => p.startDate || p.endDate, {
        newest: 'Newest start',
        oldest: 'Oldest start',
      }),
      ...numberSortOptions<OpenAireProject>((p) => p.fundedAmount || p.totalCost || 0, {
        high: 'Largest funding',
        low: 'Smallest funding',
      }),
      ...alphaSortOptions<OpenAireProject>((p) => p.title || p.code),
      ...alphaSortOptions<OpenAireProject>((p) => p.funderShort || '').map((o) => ({
        ...o,
        id: `funder-${o.id}`,
        label: o.id.includes('asc') ? 'Funder A–Z' : 'Funder Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={list.length > 0 ? `OpenAIRE / EU research (${list.length})` : 'OpenAIRE / EU research'}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        list.length === 0
          ? 'No OpenAIRE projects matched this name (free public Graph API).'
          : undefined
      }
    >
      {list.length > 0 && (
        <>
          <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
            Free OpenAIRE project search (includes EC/CORDIS when available). Funding context only —
            not efficacy claims.
          </p>
          <FilterablePaginatedList
            items={list}
            getSearchText={(p) =>
              [p.title, p.code, p.acronym, p.funderShort, p.funderName, p.jurisdiction]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="date-desc"
            filterPlaceholder="Filter projects (title, code, funder…)"
            getKey={(p, i) => `${p.id || p.code}-${i}`}
            renderItem={(p) => (
              <div className="py-2 border-b border-slate-700/60 last:border-0" data-testid="openaire-project-row">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100">{p.title || '—'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {[p.code, p.acronym, p.funderShort || p.funderName, p.jurisdiction]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {(p.fundedAmount > 0 || p.totalCost > 0) && (
                    <span className="text-[10px] font-mono text-emerald-300/90 shrink-0">
                      {p.fundedAmount > 0
                        ? `€${Math.round(p.fundedAmount).toLocaleString()}`
                        : `€${Math.round(p.totalCost).toLocaleString()} total`}
                    </span>
                  )}
                </div>
                {(p.startDate || p.endDate) && (
                  <p className="text-[10px] text-slate-600 mt-1">
                    {p.startDate || '?'} → {p.endDate || '?'}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('other', p.url, {
                        panelId: panelId || 'openaire-projects',
                        label: p.code || p.title,
                      })
                    }
                  >
                    OpenAIRE ↗
                  </a>
                  {p.cordisUrl && (
                    <a
                      href={p.cordisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline"
                      onClick={() =>
                        onDeepLinkClick('other', p.cordisUrl!, {
                          panelId: panelId || 'openaire-projects',
                          label: p.code,
                        })
                      }
                    >
                      CORDIS ↗
                    </a>
                  )}
                </div>
              </div>
            )}
          />
        </>
      )}
    </Panel>
  )
})
