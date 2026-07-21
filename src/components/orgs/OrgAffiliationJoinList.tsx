'use client'

/**
 * Dense listview for Orgs → Sponsor joins.
 * Search / filter by edge kind / sort — token-overlap edges only (not official graphs).
 */

import { useMemo, useState } from 'react'
import type { AffiliationEdge, AffiliationKind } from '@/lib/orgAffiliationJoin'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

const KIND_LABEL: Record<AffiliationKind, string> = {
  'sponsor-ror': 'Sponsor → ROR',
  'ror-hospital': 'ROR → hospital',
  'ror-college': 'ROR → college',
  'hospital-college': 'Hospital → college',
}

const KIND_CHIP: Record<AffiliationKind, string> = {
  'sponsor-ror': 'border-violet-800/50 text-violet-300',
  'ror-hospital': 'border-rose-800/50 text-rose-300',
  'ror-college': 'border-sky-800/50 text-sky-300',
  'hospital-college': 'border-amber-800/50 text-amber-300',
}

type JoinSort = 'score' | 'kind' | 'left' | 'right'
type JoinFilter = 'all' | AffiliationKind

const SORT_OPTIONS: { id: JoinSort; label: string }[] = [
  { id: 'score', label: 'Score' },
  { id: 'kind', label: 'Kind' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
]

const FILTERS: { id: JoinFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sponsor-ror', label: 'Sponsor → ROR' },
  { id: 'ror-hospital', label: 'ROR → hospital' },
  { id: 'ror-college', label: 'ROR → college' },
  { id: 'hospital-college', label: 'Hospital → college' },
]

export function OrgAffiliationJoinList({
  edges,
  notes = [],
}: {
  edges: AffiliationEdge[]
  notes?: string[]
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<JoinFilter>('all')
  const [sort, setSort] = useState<JoinSort>('score')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filterCounts = useMemo(() => {
    const m: Record<JoinFilter, number> = {
      all: edges.length,
      'sponsor-ror': 0,
      'ror-hospital': 0,
      'ror-college': 0,
      'hospital-college': 0,
    }
    for (const e of edges) m[e.kind] += 1
    return m
  }, [edges])

  const filteredSorted = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = filter === 'all' ? [...edges] : edges.filter((e) => e.kind === filter)
    if (needle) {
      list = list.filter((e) => {
        const hay = [
          e.leftLabel,
          e.rightLabel,
          e.kind,
          KIND_LABEL[e.kind],
          e.detail ?? '',
          e.leftHref ?? '',
          e.rightHref ?? '',
          String(Math.round(e.score * 100)),
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
    }
    list.sort((a, b) => {
      if (sort === 'kind') {
        const k = a.kind.localeCompare(b.kind)
        return k !== 0 ? k : b.score - a.score
      }
      if (sort === 'left') {
        const k = a.leftLabel.localeCompare(b.leftLabel)
        return k !== 0 ? k : b.score - a.score
      }
      if (sort === 'right') {
        const k = a.rightLabel.localeCompare(b.rightLabel)
        return k !== 0 ? k : b.score - a.score
      }
      // score desc
      const d = b.score - a.score
      return d !== 0 ? d : a.leftLabel.localeCompare(b.leftLabel)
    })
    return list
  }, [edges, query, filter, sort])

  if (edges.length === 0) {
    return (
      <div data-testid="orgs-affiliation-join">
        {notes.map((n) => (
          <p key={n} className="mb-2 text-[10px] text-amber-500/80">
            {n}
          </p>
        ))}
        <p
          className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-6 text-center text-[12px] text-slate-500 opacity-30"
          data-testid="orgs-joins-empty"
        >
          No affiliation edges yet — run the pipeline and/or paste sponsors above.
        </p>
      </div>
    )
  }

  return (
    <div data-testid="orgs-affiliation-join">
      {notes.map((n) => (
        <p key={n} className="mb-2 text-[10px] text-amber-500/80">
          {n}
        </p>
      ))}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search left, right, kind, score…"
          className="w-full min-w-[14rem] rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 sm:w-64"
          data-testid="orgs-joins-search"
          aria-label="Search sponsor joins"
        />
        <span className="ml-auto tabular-nums text-[10px] text-slate-500">
          {filteredSorted.length} of {edges.length}
        </span>
      </div>

      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {FILTERS.map((f) => {
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
              data-testid={`orgs-joins-filter-${f.id}`}
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
            data-testid={`orgs-joins-sort-${s.id}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filteredSorted.length === 0 ? (
        <p
          className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-4 text-center text-[12px] text-slate-500 opacity-30"
          data-testid="orgs-joins-no-match"
        >
          No edges match this search / filter.
        </p>
      ) : (
        <ul
          className="max-h-[min(36rem,70vh)] divide-y divide-slate-800/80 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-800 bg-slate-950/40"
          data-testid="orgs-joins-rows"
        >
          {filteredSorted.map((e) => {
            const open = expandedId === e.id
            const pct = Math.round(e.score * 100)
            const lowScore = pct < 50
            return (
              <li
                key={e.id}
                className={`bg-slate-900/30 ${lowScore ? 'opacity-80' : ''}`}
                data-testid="orgs-join-edge"
              >
                <div className="flex w-full items-stretch gap-0">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : e.id)}
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
                        <span
                          className={`rounded border px-1 py-px text-[9px] font-semibold uppercase ${KIND_CHIP[e.kind]}`}
                        >
                          {KIND_LABEL[e.kind]}
                        </span>
                        <span
                          className={`font-mono text-[10px] tabular-nums ${
                            pct >= 70
                              ? 'text-emerald-400/90'
                              : pct >= 50
                                ? 'text-slate-400'
                                : 'text-slate-600 opacity-30'
                          }`}
                        >
                          {pct}%
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-slate-200">
                        <span className="font-medium">{e.leftLabel}</span>
                        <span className="mx-1.5 text-slate-600">↔</span>
                        <span className="font-medium">{e.rightLabel}</span>
                      </span>
                    </span>
                  </button>
                  {(e.rightHref || e.leftHref) && (
                    <div className="flex shrink-0 items-center gap-1 px-2">
                      {e.rightHref ? (
                        <a
                          href={e.rightHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-indigo-300 hover:border-indigo-700"
                          data-testid="orgs-joins-open-right"
                          onClick={() =>
                            onDeepLinkClick('other', e.rightHref!, {
                              panelId: 'orgs-join',
                              label: e.kind,
                            })
                          }
                        >
                          Open
                        </a>
                      ) : e.leftHref ? (
                        <a
                          href={e.leftHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-indigo-300 hover:border-indigo-700"
                          onClick={() =>
                            onDeepLinkClick('other', e.leftHref!, {
                              panelId: 'orgs-join',
                              label: e.kind,
                            })
                          }
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                  )}
                </div>
                {open && (
                  <div className="space-y-2 border-t border-slate-800/80 bg-slate-950/50 px-3 py-2.5 sm:px-4">
                    <dl className="grid gap-1 text-[11px] sm:grid-cols-2">
                      <div className="flex gap-2 min-w-0">
                        <dt className="shrink-0 text-slate-600">kind</dt>
                        <dd className="text-slate-300">{KIND_LABEL[e.kind]}</dd>
                      </div>
                      <div className="flex gap-2 min-w-0">
                        <dt className="shrink-0 text-slate-600">score</dt>
                        <dd className="font-mono text-slate-300">
                          {pct}% · {(e.score).toFixed(3)}
                        </dd>
                      </div>
                      <div className="flex gap-2 min-w-0 sm:col-span-2">
                        <dt className="shrink-0 text-slate-600">left</dt>
                        <dd className="text-slate-300">
                          {e.leftHref ? (
                            <a
                              href={e.leftHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline"
                            >
                              {e.leftLabel}
                            </a>
                          ) : (
                            e.leftLabel
                          )}
                        </dd>
                      </div>
                      <div className="flex gap-2 min-w-0 sm:col-span-2">
                        <dt className="shrink-0 text-slate-600">right</dt>
                        <dd className="text-slate-300">
                          {e.rightHref ? (
                            <a
                              href={e.rightHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline"
                            >
                              {e.rightLabel}
                            </a>
                          ) : (
                            e.rightLabel
                          )}
                        </dd>
                      </div>
                      {e.detail && (
                        <div className="flex gap-2 min-w-0 sm:col-span-2">
                          <dt className="shrink-0 text-slate-600">detail</dt>
                          <dd className="text-slate-400">{e.detail}</dd>
                        </div>
                      )}
                      <div className="flex gap-2 min-w-0 sm:col-span-2">
                        <dt className="shrink-0 text-slate-600">id</dt>
                        <dd className="font-mono text-[10px] text-slate-500 break-all">{e.id}</dd>
                      </div>
                      <div className="flex gap-2 min-w-0 sm:col-span-2">
                        <dt className="shrink-0 text-slate-600">method</dt>
                        <dd className="text-slate-500">
                          Deterministic token overlap (Jaccard + substring boost). Not an official
                          affiliation graph or referral ranking.
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
