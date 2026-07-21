'use client'

/**
 * Dense searchable list of all lab-dossier bags (ROR, OpenAlex, colleges,
 * hospitals, grants, OpenAIRE, joins, deep links).
 */

import { useMemo, useState } from 'react'
import type { ResearchLabDossier } from '@/lib/researchLabs'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

export type DossierBag =
  | 'ror'
  | 'openalex'
  | 'college'
  | 'hospital'
  | 'grant'
  | 'openaire'
  | 'join'
  | 'link'

interface BagRow {
  id: string
  bag: DossierBag
  title: string
  meta: string
  location: string
  href?: string
  score?: number
  extra?: string
  haystack: string
}

const BAG_LABEL: Record<DossierBag, string> = {
  ror: 'ROR',
  openalex: 'OpenAlex',
  college: 'Scorecard',
  hospital: 'CMS hospital',
  grant: 'NIH grant',
  openaire: 'OpenAIRE',
  join: 'Join',
  link: 'Deep link',
}

const BAG_CHIP: Record<DossierBag, string> = {
  ror: 'border-violet-800/50 text-violet-300',
  openalex: 'border-amber-800/50 text-amber-300',
  college: 'border-sky-800/50 text-sky-300',
  hospital: 'border-rose-800/50 text-rose-300',
  grant: 'border-emerald-800/50 text-emerald-300',
  openaire: 'border-cyan-800/50 text-cyan-300',
  join: 'border-indigo-800/50 text-indigo-300',
  link: 'border-slate-600 text-slate-400',
}

type BagSort = 'title' | 'bag' | 'location' | 'score'
type BagFilter = 'all' | DossierBag

const SORT_OPTIONS: { id: BagSort; label: string }[] = [
  { id: 'title', label: 'Title' },
  { id: 'bag', label: 'Bag' },
  { id: 'location', label: 'Location' },
  { id: 'score', label: 'Score' },
]

function buildBagRows(dossier: ResearchLabDossier): BagRow[] {
  const rows: BagRow[] = []
  const push = (row: Omit<BagRow, 'haystack'>) => {
    rows.push({
      ...row,
      haystack: [row.title, row.meta, row.location, row.extra, row.bag, row.href ?? '']
        .join(' ')
        .toLowerCase(),
    })
  }

  for (const o of dossier.rorOrgs) {
    const location = [o.city, o.countryName || o.countryCode].filter(Boolean).join(', ')
    push({
      id: `ror:${o.rorId}`,
      bag: 'ror',
      title: o.name,
      meta: [o.types?.slice(0, 3).join(', '), o.status].filter(Boolean).join(' · '),
      location,
      href: o.idUrl || `https://ror.org/${o.rorId}`,
      extra: o.rorId,
    })
  }

  for (const i of dossier.openAlexInstitutions) {
    const location = [i.city, i.countryCode].filter(Boolean).join(', ')
    push({
      id: `oa:${i.openAlexId}`,
      bag: 'openalex',
      title: i.name,
      meta: [i.type, i.worksCount != null ? `${i.worksCount} works` : ''].filter(Boolean).join(' · '),
      location,
      href: i.openAlexUrl || i.homepage || undefined,
      extra: i.openAlexId,
    })
  }

  for (const c of dossier.colleges) {
    const location = [c.city, c.state].filter(Boolean).join(', ')
    push({
      id: `college:${c.id}`,
      bag: 'college',
      title: c.name,
      meta: [c.ownership, c.source].filter(Boolean).join(' · '),
      location: location || 'US',
      href: c.scorecardUrl,
      extra: c.id,
    })
  }

  for (const h of dossier.hospitals) {
    const location = [h.city, h.state].filter(Boolean).join(', ')
    push({
      id: `hospital:${h.facilityId}`,
      bag: 'hospital',
      title: h.facilityName,
      meta: [h.hospitalType, h.ownership].filter(Boolean).join(' · '),
      location,
      href: h.careCompareUrl,
      extra: h.facilityId,
    })
  }

  for (const g of dossier.grants) {
    push({
      id: `grant:${g.projectNumber || g.title}`,
      bag: 'grant',
      title: g.title || g.projectNumber || 'NIH project',
      meta: [g.projectNumber, g.piName, g.institute].filter(Boolean).join(' · '),
      location: g.institute || '',
      extra: g.projectNumber,
    })
  }

  for (const a of dossier.openAire) {
    push({
      id: `openaire:${a.id}`,
      bag: 'openaire',
      title: a.title || a.id,
      meta: a.kind,
      location: '',
      href: a.href,
      extra: a.id,
    })
  }

  for (const e of dossier.affiliationEdges) {
    push({
      id: `join:${e.id}`,
      bag: 'join',
      title: `${e.leftLabel} ↔ ${e.rightLabel}`,
      meta: e.kind,
      location: '',
      href: e.rightHref || e.leftHref,
      score: e.score,
      extra: e.id,
    })
  }

  for (const l of dossier.deepLinks) {
    push({
      id: `link:${l.url}:${l.label}`,
      bag: 'link',
      title: l.label,
      meta: l.source,
      location: '',
      href: l.url,
    })
  }

  return rows
}

export function ResearchLabDossierBagsList({ dossier }: { dossier: ResearchLabDossier }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<BagFilter>('all')
  const [sort, setSort] = useState<BagSort>('bag')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const allRows = useMemo(() => buildBagRows(dossier), [dossier])

  const filterCounts = useMemo(() => {
    const m: Record<BagFilter, number> = {
      all: allRows.length,
      ror: 0,
      openalex: 0,
      college: 0,
      hospital: 0,
      grant: 0,
      openaire: 0,
      join: 0,
      link: 0,
    }
    for (const r of allRows) m[r.bag] += 1
    return m
  }, [allRows])

  const filteredSorted = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = filter === 'all' ? [...allRows] : allRows.filter((r) => r.bag === filter)
    if (needle) {
      list = list.filter((r) => r.haystack.includes(needle))
    }
    list.sort((a, b) => {
      if (sort === 'bag') {
        const s = a.bag.localeCompare(b.bag)
        return s !== 0 ? s : a.title.localeCompare(b.title)
      }
      if (sort === 'location') {
        const s = (a.location || 'zzz').localeCompare(b.location || 'zzz')
        return s !== 0 ? s : a.title.localeCompare(b.title)
      }
      if (sort === 'score') {
        const as = a.score ?? -1
        const bs = b.score ?? -1
        if (bs !== as) return bs - as
        return a.title.localeCompare(b.title)
      }
      return a.title.localeCompare(b.title)
    })
    return list
  }, [allRows, query, filter, sort])

  const filters: { id: BagFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'ror', label: 'ROR' },
    { id: 'openalex', label: 'OpenAlex' },
    { id: 'college', label: 'Scorecard' },
    { id: 'hospital', label: 'Hospital' },
    { id: 'grant', label: 'NIH grant' },
    { id: 'openaire', label: 'OpenAIRE' },
    { id: 'join', label: 'Join' },
    { id: 'link', label: 'Deep link' },
  ]

  if (allRows.length === 0) {
    return (
      <p
        className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-6 text-center text-[12px] text-slate-500 opacity-30"
        data-testid="dossier-bags-empty"
      >
        No bag rows in this dossier.
      </p>
    )
  }

  return (
    <div data-testid="dossier-bags-list">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bags: name, location, id…"
          className="w-full min-w-[14rem] rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 sm:w-64"
          data-testid="dossier-bags-search"
          aria-label="Search dossier bags"
        />
        <span className="ml-auto tabular-nums text-[10px] text-slate-500">
          {filteredSorted.length} of {allRows.length}
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
              data-testid={`dossier-bags-filter-${f.id}`}
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
            data-testid={`dossier-bags-sort-${s.id}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filteredSorted.length === 0 ? (
        <p
          className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-4 text-center text-[12px] text-slate-500 opacity-30"
          data-testid="dossier-bags-no-match"
        >
          No rows match this search / filter.
        </p>
      ) : (
        <ul
          className="max-h-[min(40rem,75vh)] divide-y divide-slate-800/80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40"
          data-testid="dossier-bags-rows"
        >
          {filteredSorted.map((r) => {
            const open = expandedId === r.id
            return (
              <li key={r.id} className="bg-slate-900/30" data-testid={`dossier-bag-row-${r.bag}`}>
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
                          {r.title}
                        </span>
                        <span
                          className={`rounded border px-1 py-px text-[9px] font-semibold uppercase ${BAG_CHIP[r.bag]}`}
                        >
                          {BAG_LABEL[r.bag]}
                        </span>
                        {r.score != null && (
                          <span className="font-mono text-[10px] tabular-nums text-slate-500">
                            {Math.round(r.score * 100)}%
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-slate-500">
                        {r.location ? (
                          <span className="truncate max-w-[14rem]">{r.location}</span>
                        ) : (
                          <span className="opacity-30">—</span>
                        )}
                        {r.meta && (
                          <span className="truncate max-w-[22rem] text-slate-600">{r.meta}</span>
                        )}
                      </span>
                    </span>
                  </button>
                  {r.href && (
                    <div className="flex shrink-0 items-center px-2">
                      <a
                        href={r.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-indigo-300 hover:border-indigo-700"
                        onClick={() =>
                          onDeepLinkClick('other', r.href!, {
                            panelId: 'research-lab-dossier',
                            label: r.bag,
                          })
                        }
                      >
                        Open
                      </a>
                    </div>
                  )}
                </div>
                {open && (
                  <div className="space-y-1 border-t border-slate-800/80 bg-slate-950/50 px-3 py-2.5 sm:px-4">
                    <dl className="grid gap-1 text-[11px] sm:grid-cols-2">
                      <div className="flex gap-2 min-w-0">
                        <dt className="shrink-0 text-slate-600">bag</dt>
                        <dd className="text-slate-300">{BAG_LABEL[r.bag]}</dd>
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
                          <dd className="font-mono text-slate-400 break-all">{r.extra}</dd>
                        </div>
                      )}
                      {r.meta && (
                        <div className="flex gap-2 min-w-0 sm:col-span-2">
                          <dt className="shrink-0 text-slate-600">detail</dt>
                          <dd className="text-slate-400">{r.meta}</dd>
                        </div>
                      )}
                      {r.score != null && (
                        <div className="flex gap-2 min-w-0">
                          <dt className="shrink-0 text-slate-600">score</dt>
                          <dd className="font-mono text-slate-300">
                            {Math.round(r.score * 100)}% · {r.score.toFixed(3)}
                          </dd>
                        </div>
                      )}
                      {r.href && (
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
                      )}
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
