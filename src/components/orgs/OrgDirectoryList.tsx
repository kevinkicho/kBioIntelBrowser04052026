'use client'

/**
 * Dense directory list for Orgs → Directory lists.
 * Merges ROR · EU pack · US Scorecard · CMS hospitals with search / filter / sort.
 */

import { useMemo, useState } from 'react'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export type DirectorySource = 'ror' | 'eu' | 'college' | 'hospital'

export interface DirectoryRow {
  id: string
  source: DirectorySource
  name: string
  meta: string
  location: string
  href: string
  extra?: string
  types?: string[]
}

const SOURCE_LABEL: Record<DirectorySource, string> = {
  ror: 'ROR',
  eu: 'EU pack',
  college: 'Scorecard',
  hospital: 'CMS hospital',
}

const SOURCE_CHIP: Record<DirectorySource, string> = {
  ror: 'border-violet-800/50 text-violet-300',
  eu: 'border-indigo-800/50 text-indigo-300',
  college: 'border-sky-800/50 text-sky-300',
  hospital: 'border-rose-800/50 text-rose-300',
}

type DirectorySort = 'name' | 'source' | 'location'
type DirectoryFilter = 'all' | DirectorySource

const SORT_OPTIONS: { id: DirectorySort; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'source', label: 'Source' },
  { id: 'location', label: 'Location' },
]

function buildRows(input: {
  orgs: RorOrganization[]
  euOrgs: RorOrganization[]
  colleges: UsCollege[]
  hospitals: CmsHospital[]
}): DirectoryRow[] {
  const rows: DirectoryRow[] = []
  for (const o of input.orgs) {
    const location = [o.city, o.countryName || o.countryCode].filter(Boolean).join(', ')
    rows.push({
      id: `ror:${o.rorId}`,
      source: 'ror',
      name: o.name,
      meta: [o.types?.slice(0, 3).join(', '), o.status].filter(Boolean).join(' · '),
      location,
      href: o.idUrl || `https://ror.org/${o.rorId}`,
      extra: o.rorId,
      types: o.types,
    })
  }
  for (const o of input.euOrgs) {
    const location = [o.city, o.countryName || o.countryCode].filter(Boolean).join(', ')
    rows.push({
      id: `eu:${o.rorId}`,
      source: 'eu',
      name: o.name,
      meta: [o.types?.slice(0, 3).join(', '), o.matchSource].filter(Boolean).join(' · '),
      location,
      href: o.idUrl || `https://ror.org/${o.rorId}`,
      extra: o.rorId,
      types: o.types,
    })
  }
  for (const c of input.colleges) {
    const location = [c.city, c.state].filter(Boolean).join(', ')
    rows.push({
      id: `college:${c.id}`,
      source: 'college',
      name: c.name,
      meta: [c.ownership, c.source].filter(Boolean).join(' · '),
      location: location || 'US',
      href: c.scorecardUrl,
      extra: c.id,
    })
  }
  for (const h of input.hospitals) {
    const location = [h.city, h.state].filter(Boolean).join(', ')
    rows.push({
      id: `hospital:${h.facilityId}`,
      source: 'hospital',
      name: h.facilityName,
      meta: [h.hospitalType, h.ownership, h.overallRating ? `rating ${h.overallRating}` : '']
        .filter(Boolean)
        .join(' · '),
      location,
      href: h.careCompareUrl,
      extra: h.facilityId,
    })
  }
  return rows
}

export function OrgDirectoryList({
  orgs,
  euOrgs,
  colleges,
  hospitals,
  loading = false,
}: {
  orgs: RorOrganization[]
  euOrgs: RorOrganization[]
  colleges: UsCollege[]
  hospitals: CmsHospital[]
  loading?: boolean
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DirectoryFilter>('all')
  const [sort, setSort] = useState<DirectorySort>('name')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const allRows = useMemo(
    () => buildRows({ orgs, euOrgs, colleges, hospitals }),
    [orgs, euOrgs, colleges, hospitals],
  )

  const filterCounts = useMemo(() => {
    const m: Record<DirectoryFilter, number> = {
      all: allRows.length,
      ror: 0,
      eu: 0,
      college: 0,
      hospital: 0,
    }
    for (const r of allRows) m[r.source] += 1
    return m
  }, [allRows])

  const filteredSorted = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list =
      filter === 'all' ? [...allRows] : allRows.filter((r) => r.source === filter)
    if (needle) {
      list = list.filter((r) => {
        const hay = [r.name, r.meta, r.location, r.extra, r.source, ...(r.types ?? [])]
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
    }
    list.sort((a, b) => {
      if (sort === 'source') {
        const s = a.source.localeCompare(b.source)
        return s !== 0 ? s : a.name.localeCompare(b.name)
      }
      if (sort === 'location') {
        const s = (a.location || 'zzz').localeCompare(b.location || 'zzz')
        return s !== 0 ? s : a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })
    return list
  }, [allRows, query, filter, sort])

  const filters: { id: DirectoryFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'ror', label: 'ROR' },
    { id: 'eu', label: 'EU pack' },
    { id: 'college', label: 'Scorecard' },
    { id: 'hospital', label: 'CMS hospital' },
  ]

  if (!loading && allRows.length === 0) {
    return (
      <p
        className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-6 text-center text-[12px] text-slate-500 opacity-30"
        data-testid="orgs-directory-empty"
      >
        No directory hits yet — run Build dossier + search above.
      </p>
    )
  }

  return (
    <div data-testid="orgs-directory-list">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, city, type, id…"
          className="w-full min-w-[14rem] rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 sm:w-64"
          data-testid="orgs-directory-search"
          aria-label="Search directory"
        />
        <span className="ml-auto tabular-nums text-[10px] text-slate-500">
          {loading ? 'Loading…' : `${filteredSorted.length} of ${allRows.length}`}
        </span>
      </div>

      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {filters.map((f) => {
          const n = filterCounts[f.id]
          const dim = f.id !== 'all' && n === 0
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] ${
                filter === f.id
                  ? 'border-indigo-600 bg-indigo-900/40 text-indigo-200'
                  : 'border-slate-800 text-slate-500 hover:border-slate-600'
              } ${dim && filter !== f.id ? 'opacity-30' : ''}`}
              data-testid={`orgs-directory-filter-${f.id}`}
            >
              {f.label}
              {f.id !== 'all' ? ` · ${n}` : n ? ` · ${n}` : ''}
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-[10px] font-semibold uppercase text-slate-600">Sort</span>
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSort(s.id)}
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              sort === s.id
                ? 'border-slate-500 bg-slate-800 text-slate-200'
                : 'border-slate-800 text-slate-500 hover:border-slate-600'
            }`}
            data-testid={`orgs-directory-sort-${s.id}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filteredSorted.length === 0 ? (
        <p
          className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-4 text-center text-[12px] text-slate-500 opacity-30"
          data-testid="orgs-directory-no-match"
        >
          No rows match this search / filter.
        </p>
      ) : (
        <ul
          className="divide-y divide-slate-800/80 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40"
          data-testid="orgs-directory-rows"
        >
          {filteredSorted.map((r) => {
            const open = expandedId === r.id
            return (
              <li
                key={r.id}
                className="bg-slate-900/30"
                data-testid={`orgs-directory-row-${r.source}`}
              >
                <div className="flex w-full items-stretch gap-0">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : r.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-800/40 sm:px-3 sm:py-2"
                    aria-expanded={open}
                  >
                    <span
                      className={`shrink-0 text-[10px] text-slate-600 transition-transform ${
                        open ? 'rotate-90' : ''
                      }`}
                      aria-hidden
                    >
                      ▸
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[12px] font-medium text-slate-100 sm:text-[13px]">
                          {r.name}
                        </span>
                        <span
                          className={`rounded border px-1 py-px text-[9px] font-semibold uppercase ${SOURCE_CHIP[r.source]}`}
                        >
                          {SOURCE_LABEL[r.source]}
                        </span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-slate-500">
                        {r.location ? (
                          <span className="truncate max-w-[16rem]">{r.location}</span>
                        ) : (
                          <span className="opacity-30">no location</span>
                        )}
                        {r.meta && (
                          <span className="truncate max-w-[20rem] text-slate-600">{r.meta}</span>
                        )}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center px-2">
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-indigo-300 hover:border-indigo-700"
                      data-testid="orgs-directory-open"
                      onClick={() =>
                        onDeepLinkClick('other', r.href, {
                          panelId: 'orgs-directory',
                          label: r.source,
                        })
                      }
                    >
                      Open
                    </a>
                  </div>
                </div>
                {open && (
                  <div className="space-y-2 border-t border-slate-800/80 bg-slate-950/50 px-3 py-2.5 sm:px-4">
                    <dl className="grid gap-1 text-[11px] sm:grid-cols-2">
                      <div className="flex gap-2 min-w-0">
                        <dt className="shrink-0 text-slate-600">source</dt>
                        <dd className="text-slate-300">{SOURCE_LABEL[r.source]}</dd>
                      </div>
                      <div className="flex gap-2 min-w-0">
                        <dt className="shrink-0 text-slate-600">location</dt>
                        <dd className={r.location ? 'text-slate-300' : 'opacity-30'}>
                          {r.location || '—'}
                        </dd>
                      </div>
                      {r.extra && (
                        <div className="flex gap-2 min-w-0">
                          <dt className="shrink-0 text-slate-600">id</dt>
                          <dd className="font-mono text-slate-400 truncate">{r.extra}</dd>
                        </div>
                      )}
                      {r.meta && (
                        <div className="flex gap-2 min-w-0 sm:col-span-2">
                          <dt className="shrink-0 text-slate-600">detail</dt>
                          <dd className="text-slate-400">{r.meta}</dd>
                        </div>
                      )}
                      {r.types && r.types.length > 0 && (
                        <div className="flex gap-2 min-w-0 sm:col-span-2">
                          <dt className="shrink-0 text-slate-600">types</dt>
                          <dd className="text-slate-400">{r.types.join(', ')}</dd>
                        </div>
                      )}
                      <div className="flex gap-2 min-w-0 sm:col-span-2">
                        <dt className="shrink-0 text-slate-600">url</dt>
                        <dd className="min-w-0">
                          <a
                            href={r.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-indigo-400 hover:underline"
                          >
                            {r.href}
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
