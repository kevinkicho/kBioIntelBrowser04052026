'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { RorOrganization } from '@/lib/api/ror'
import { rorExploreUrl } from '@/lib/api/ror'
import { alphaSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export const ResearchOrgsPanel = memo(function ResearchOrgsPanel({
  orgs,
  panelId,
  lastFetched,
}: {
  orgs: RorOrganization[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(orgs) ? orgs : []
  const sortOptions = useMemo(
    () => [
      ...alphaSortOptions<RorOrganization>((o) => o.name || ''),
      ...alphaSortOptions<RorOrganization>((o) => o.countryName || o.countryCode || ''),
    ],
    [],
  )

  return (
    <Panel
      title={list.length > 0 ? `Research organizations (${list.length})` : 'Research organizations'}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        list.length === 0
          ? 'No ROR research organizations matched trial sponsors / facilities / name (free ROR API).'
          : undefined
      }
    >
      <div className="space-y-3">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Research Organization Registry (ROR) — open CC0 IDs for universities, research centers,
          and healthcare research orgs. Matched from trial sponsors/sites and related names. Not a
          clinical referral directory.{' '}
          <a
            href="https://ror.org/search"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            ROR search ↗
          </a>
        </p>
        {list.length > 0 && (
          <FilterablePaginatedList
            items={list}
            getSearchText={(o) =>
              [o.name, ...o.aliases, o.city, o.countryName, o.types.join(' '), o.matchSource]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="name-asc"
            filterPlaceholder="Filter orgs…"
            getKey={(o) => o.rorId}
            renderItem={(o) => (
              <div
                className="py-3 border-b border-slate-700/60 last:border-0"
                data-testid="ror-org-row"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 text-sm">{o.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {[o.city, o.region, o.countryName || o.countryCode]
                        .filter(Boolean)
                        .join(' · ')}
                      {o.established ? ` · est. ${o.established}` : ''}
                    </p>
                    {o.matchSource && (
                      <p className="text-[10px] text-slate-500 mt-0.5">Match: {o.matchSource}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {o.types.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] rounded border border-violet-800/40 bg-violet-950/30 text-violet-300 px-1.5 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <a
                    href={rorExploreUrl(o.rorId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                    onClick={() =>
                      onDeepLinkClick('other', rorExploreUrl(o.rorId), {
                        panelId: panelId || 'research-orgs',
                        label: o.rorId,
                      })
                    }
                  >
                    ROR record ↗
                  </a>
                  {o.website && (
                    <a
                      href={o.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:underline"
                      onClick={() =>
                        onDeepLinkClick('other', o.website!, {
                          panelId: panelId || 'research-orgs',
                          label: 'website',
                        })
                      }
                    >
                      Website ↗
                    </a>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </div>
    </Panel>
  )
})
