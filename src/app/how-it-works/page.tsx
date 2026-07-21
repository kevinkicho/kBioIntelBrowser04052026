'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ALGORITHM_CATALOG,
  COPILOT_COMPLETENESS_GATE,
  COPILOT_SYSTEM_RULES_SUMMARY,
  PROMPT_CATALOG,
  type PromptSurface,
} from '@/lib/methods/systemWiringCatalog'
import { DISCOVER_PIPELINE_STAGES, effortLabel } from '@/lib/discovery/algorithmGuide'
import {
  loadLocalFunnel,
  localFunnelRates,
  resetLocalFunnel,
  type LocalFunnelSnapshot,
} from '@/lib/analytics/localFunnel'

const SURFACE_LABELS: Record<PromptSurface, string> = {
  molecule_copilot: 'Molecule copilot',
  gene_copilot: 'Gene copilot',
  disease_copilot: 'Disease copilot',
  pack_ai: 'Evidence pack AI',
  hypothesis: 'Hypothesis builder',
  discover_off_path: 'Not used for ranking',
}

const NOT_WIRED = [
  'no LLM inventing Discover ranks or composite scores',
  'no paid commercial compound DBs as product requirements',
  'no regulatory decision support or “this drug works” language',
  'no full 15-panel pack fetch for board density (Core panels only)',
  'no multi-tenant cloud board requirement (solo + export default)',
  'no de novo generative chemistry / biologics-first entity model',
] as const

/** Term + detail for the overview definition list (not stacked checklists). */
const PRODUCT_LAW_ROWS: readonly [string, string][] = [
  [
    'Free public APIs',
    'No paid databases or API keys as product requirements. Everything ranks and panels show comes from public endpoints you can open yourself.',
  ],
  [
    'Evidence-first',
    'Panels and packs surface retrieved data and citations. Empty or timeout means not retrieved — not “no association.”',
  ],
  [
    'Deterministic rank',
    'Discover composite scores are weighted multi-axis math over free-API features. LLMs never write of-record ranks.',
  ],
  [
    'Claim-bound AI',
    'Pack / RH / copilot outputs must cite allowlisted claims or panel keys. Sparse evidence refuses deep synthesis.',
  ],
  [
    'Solo by default',
    'Local storage, IDB, and file export. Cloud auth is optional; the Discover → pack loop never requires a multi-tenant DB.',
  ],
]

type TabId = 'overview' | 'algorithms' | 'prompts' | 'funnel'
type PromptSort = 'label' | 'surface' | 'where'

const PROMPT_SORT_OPTIONS: { id: PromptSort; label: string }[] = [
  { id: 'label', label: 'Name' },
  { id: 'surface', label: 'Surface' },
  { id: 'where', label: 'Where' },
]

export default function HowItWorksPage() {
  const [tab, setTab] = useState<TabId>('overview')
  const [promptFilter, setPromptFilter] = useState<PromptSurface | 'all'>('all')
  const [promptQuery, setPromptQuery] = useState('')
  const [promptSort, setPromptSort] = useState<PromptSort>('surface')
  const [openPrompt, setOpenPrompt] = useState<string | null>(null)
  const [openAlgo, setOpenAlgo] = useState<string | null>(null)
  const [funnel, setFunnel] = useState<LocalFunnelSnapshot | null>(null)

  useEffect(() => {
    setFunnel(loadLocalFunnel())
    // Honor #hash anchors from Discover deep-links
    if (typeof window !== 'undefined' && window.location.hash) {
      const id = window.location.hash.slice(1)
      if (id === 'discover_rank' || ALGORITHM_CATALOG.some((a) => a.id === id)) {
        setTab('algorithms')
        setOpenAlgo(id === 'discover_rank' ? 'discover_rank' : id)
        window.setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [])

  const surfaceCounts = useMemo(() => {
    const m = new Map<PromptSurface | 'all', number>()
    m.set('all', PROMPT_CATALOG.length)
    for (const p of PROMPT_CATALOG) {
      m.set(p.surface, (m.get(p.surface) ?? 0) + 1)
    }
    return m
  }, [])

  const prompts = useMemo(() => {
    const needle = promptQuery.trim().toLowerCase()
    let list =
      promptFilter === 'all'
        ? [...PROMPT_CATALOG]
        : PROMPT_CATALOG.filter((p) => p.surface === promptFilter)
    if (needle) {
      list = list.filter((p) => {
        const hay = [
          p.id,
          p.label,
          p.where,
          p.purpose,
          p.sourceSymbol,
          SURFACE_LABELS[p.surface],
          ...p.inputs,
          ...p.constraints,
          p.systemExcerpt ?? '',
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
    }
    list.sort((a, b) => {
      if (promptSort === 'label') return a.label.localeCompare(b.label)
      if (promptSort === 'where') {
        const w = a.where.localeCompare(b.where)
        return w !== 0 ? w : a.label.localeCompare(b.label)
      }
      // surface then label
      const s = a.surface.localeCompare(b.surface)
      return s !== 0 ? s : a.label.localeCompare(b.label)
    })
    return list
  }, [promptFilter, promptQuery, promptSort])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="page-canvas">
        <p className="mb-1 text-[11px] font-mono text-slate-600">
          <Link href="/" className="hover:text-slate-400">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-500">How it works</span>
        </p>

        <h1 className="text-2xl font-bold tracking-tight text-slate-50 mb-1 sm:text-3xl">
          How BioIntel is wired
        </h1>
        <p className="text-[13px] text-slate-400 leading-relaxed mb-4 max-w-4xl">
          Transparent view of <strong className="text-slate-300 font-medium">algorithms</strong>{' '}
          (deterministic, free public APIs) and <strong className="text-slate-300 font-medium">AI
          prompts</strong> (claim-bound / evidence-gated). Nothing here invents Discover ranks.
        </p>

        <div
          className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1"
          role="tablist"
        >
          {(
            [
              ['overview', 'Overview'],
              ['algorithms', 'Algorithms'],
              ['prompts', 'AI prompts'],
              ['funnel', 'Your loop'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <article
            className="max-w-3xl text-[13px] leading-relaxed text-slate-400"
            data-testid="how-overview"
          >
            <p className="text-[15px] leading-relaxed text-slate-300">
              BioIntel is a solo discovery workbench over <strong className="font-medium text-slate-200">free public APIs</strong>.
              Of-record ranking is always deterministic. AI (your Ollama key) only runs{' '}
              <strong className="font-medium text-slate-200">claim-bound</strong> on packs, research
              hypotheses, and profile copilot — never in the Discover rank path.
            </p>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Product law
            </h2>
            <dl className="divide-y divide-slate-800/80 border-y border-slate-800/80">
              {PRODUCT_LAW_ROWS.map(([term, detail]) => (
                <div
                  key={term}
                  className="grid gap-1 py-2.5 sm:grid-cols-[9.5rem_1fr] sm:gap-4"
                >
                  <dt className="text-[12px] font-medium text-slate-200">{term}</dt>
                  <dd className="text-[12px] text-slate-400 leading-snug">{detail}</dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Two paths
            </h2>
            <p className="mb-3 text-[12px] text-slate-500">
              Everything in the product is either a deterministic free-API pipeline or a gated AI
              surface. They never write each other’s of-record scores.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
              <div>
                <p className="text-[12px] font-semibold text-emerald-300/90">Discover ranking</p>
                <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">
                  Disease resolve → targets → gather candidates → PubChem identity for top-N →
                  weighted multi-axis score → optional openFDA / literature harvest. Rubric
                  weights are yours; the engine never invents axes.
                </p>
                <p className="mt-2 text-[11px]">
                  <Link href="/discover" className="text-indigo-400 hover:underline">
                    Open Discover
                  </Link>
                  <span className="text-slate-600"> · </span>
                  <button
                    type="button"
                    onClick={() => setTab('algorithms')}
                    className="text-indigo-400 hover:underline"
                  >
                    Algorithms tab
                  </button>
                </p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-indigo-300/90">AI (BYOM Ollama)</p>
                <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">
                  Profile copilot, pack AI, RH seed, disease intelligence. Prompts inject retrieved
                  public data only. System rules require panel citations; deep synthesis is refused
                  when evidence is thin ({COPILOT_COMPLETENESS_GATE.minPanelsWithData}+ panels with
                  data, ≥{Math.round(COPILOT_COMPLETENESS_GATE.minCompletenessRatio * 100)}%
                  completeness).
                </p>
                <p className="mt-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTab('prompts')}
                    className="text-indigo-400 hover:underline"
                  >
                    AI prompts tab
                  </button>
                </p>
              </div>
            </div>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Discover pipeline
            </h2>
            <p className="mb-3 text-[12px] text-slate-500">
              Rank path end-to-end (wall-time notes are educational, not live timers).
            </p>
            <ol className="space-y-0 border-l border-slate-800 pl-4">
              {DISCOVER_PIPELINE_STAGES.map((s, i) => (
                <li key={s.id} className="relative pb-3 last:pb-0">
                  <span
                    className="absolute -left-4 top-1.5 h-1.5 w-1.5 -translate-x-[3.5px] rounded-full bg-indigo-500/70"
                    aria-hidden
                  />
                  <span className="text-[10px] font-mono text-slate-600">{i + 1}.</span>{' '}
                  <span className="text-[12px] font-medium text-slate-200">{s.title}</span>
                  <span className="text-[12px] text-slate-500"> — {s.short}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-600">
                    {effortLabel(s.effort)} · {s.sources.join(' · ')}
                  </span>
                </li>
              ))}
            </ol>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              AI system rules
            </h2>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              {COPILOT_SYSTEM_RULES_SUMMARY.join(' ')}{' '}
              <span className="text-slate-500">
                Completeness gate: {COPILOT_COMPLETENESS_GATE.description}
              </span>
            </p>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Out of scope
            </h2>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              {NOT_WIRED.join('; ')}. UI empty states use opacity ~0.3 so filled signal stands out.
            </p>

            <p className="mt-8 text-[11px] text-slate-600">
              For your own completion metrics, see{' '}
              <button
                type="button"
                onClick={() => setTab('funnel')}
                className="text-indigo-400/90 hover:underline"
              >
                Your loop
              </button>
              . Source of truth:{' '}
              <code className="text-slate-500">docs/design/discovery-workbench-*.md</code>,{' '}
              <code className="text-slate-500">src/lib/discovery/</code>,{' '}
              <code className="text-slate-500">src/lib/ai/</code>.
            </p>
          </article>
        )}

        {tab === 'algorithms' && (
          <div className="space-y-3" data-testid="how-algorithms">
            <p className="text-[12px] text-slate-500 mb-2">
              Each card is a real code path. Expand for steps and source files.
            </p>
            {ALGORITHM_CATALOG.map((algo) => {
              const open = openAlgo === algo.id
              return (
                <div
                  key={algo.id}
                  id={algo.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden scroll-mt-20"
                >
                  <button
                    type="button"
                    onClick={() => setOpenAlgo(open ? null : algo.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-800/30"
                    aria-expanded={open}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">{algo.title}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${
                            algo.usesLlm
                              ? 'border-indigo-800/50 text-indigo-300 bg-indigo-950/40'
                              : 'border-emerald-800/50 text-emerald-300 bg-emerald-950/40'
                          }`}
                        >
                          {algo.usesLlm ? 'Uses LLM' : 'No LLM'}
                        </span>
                        <span className="text-[9px] text-slate-600 uppercase">{algo.area}</span>
                      </span>
                      <span className="mt-0.5 block text-[12px] text-slate-500 leading-snug">
                        {algo.summary}
                      </span>
                    </span>
                    <span className={`text-slate-500 ${open ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-800 px-4 py-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1.5">
                          Steps
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-[12px] text-slate-400">
                          {algo.steps.map((st) => (
                            <li key={st} className="leading-snug">
                              {st}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1.5">
                          Code areas
                        </p>
                        <ul className="space-y-0.5">
                          {algo.codeAreas.map((c) => (
                            <li
                              key={c}
                              className="font-mono text-[10px] text-cyan-600/90 break-all"
                            >
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'prompts' && (
          <div className="space-y-2" data-testid="how-prompts">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-[12px] text-slate-500 max-w-3xl leading-relaxed">
                Dense catalog of modes sent to your Ollama model. User messages always include{' '}
                <em className="text-slate-400">retrieved public data</em> — not free invention.
                Expand a row for inputs, constraints, and system excerpts.
              </p>
              <input
                type="search"
                value={promptQuery}
                onChange={(e) => setPromptQuery(e.target.value)}
                placeholder="Filter name, surface, symbol…"
                className="w-full min-w-[12rem] rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 sm:w-56"
                data-testid="how-prompts-search"
                aria-label="Filter AI prompts"
              />
            </div>

            {/* Surface filter chips */}
            <div className="flex flex-wrap items-center gap-1">
              <FilterChip
                active={promptFilter === 'all'}
                onClick={() => setPromptFilter('all')}
                label={`All · ${surfaceCounts.get('all') ?? 0}`}
              />
              {(Object.keys(SURFACE_LABELS) as PromptSurface[]).map((s) => {
                const n = surfaceCounts.get(s) ?? 0
                return (
                  <FilterChip
                    key={s}
                    active={promptFilter === s}
                    onClick={() => setPromptFilter(s)}
                    label={`${SURFACE_LABELS[s]} · ${n}`}
                    dim={n === 0}
                  />
                )
              })}
            </div>

            {/* Sort + count */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[10px] font-semibold uppercase text-slate-600">Sort</span>
              {PROMPT_SORT_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPromptSort(s.id)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    promptSort === s.id
                      ? 'border-slate-500 bg-slate-800 text-slate-200'
                      : 'border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                  data-testid={`how-prompts-sort-${s.id}`}
                >
                  {s.label}
                </button>
              ))}
              <span className="ml-auto tabular-nums text-[10px] text-slate-500">
                {prompts.length} of {PROMPT_CATALOG.length}
              </span>
            </div>

            {/* Dense listview */}
            {prompts.length === 0 ? (
              <p
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-4 text-center text-[12px] text-slate-500 opacity-30"
                data-testid="how-prompts-empty"
              >
                No prompts match this filter.
              </p>
            ) : (
              <ul
                className="divide-y divide-slate-800/80 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40"
                data-testid="how-prompts-list"
              >
                {prompts.map((p) => {
                  const open = openPrompt === p.id
                  return (
                    <li
                      key={p.id}
                      className="bg-slate-900/30"
                      data-testid={`prompt-card-${p.id}`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenPrompt(open ? null : p.id)}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-800/40 sm:px-3 sm:py-2"
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
                              {p.label}
                            </span>
                            <span className="rounded border border-slate-700/80 px-1 py-px text-[9px] text-slate-500">
                              {SURFACE_LABELS[p.surface]}
                            </span>
                            {!p.affectsDiscoverRank && (
                              <span className="text-[9px] text-emerald-600/90">≠ rank</span>
                            )}
                            {p.systemExcerpt ? (
                              <span className="text-[9px] text-indigo-500/80">has excerpt</span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-slate-500">
                            <span className="truncate max-w-full sm:max-w-[28rem]">{p.where}</span>
                            <span className="hidden font-mono text-slate-600 sm:inline">
                              {p.sourceSymbol}
                            </span>
                          </span>
                          {!open && (
                            <span className="mt-0.5 block line-clamp-1 text-[11px] text-slate-400">
                              {p.purpose}
                            </span>
                          )}
                        </span>
                      </button>
                      {open && (
                        <div className="space-y-2.5 border-t border-slate-800/80 bg-slate-950/50 px-3 py-2.5 sm:px-4">
                          <p className="text-[12px] leading-relaxed text-slate-300">{p.purpose}</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                Inputs to the model
                              </p>
                              <ul className="space-y-0.5 text-[11px] text-slate-400">
                                {p.inputs.map((i) => (
                                  <li key={i} className="flex gap-1.5">
                                    <span className="text-slate-600">·</span>
                                    <span>{i}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                Constraints
                              </p>
                              <ul className="space-y-0.5 text-[11px] text-slate-400">
                                {p.constraints.map((c) => (
                                  <li key={c} className="flex gap-1.5">
                                    <span className="text-slate-600">·</span>
                                    <span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <dl className="grid gap-1 text-[10px] sm:grid-cols-2">
                            <div className="flex gap-2 min-w-0">
                              <dt className="shrink-0 text-slate-600">id</dt>
                              <dd className="font-mono text-slate-400 truncate">{p.id}</dd>
                            </div>
                            <div className="flex gap-2 min-w-0">
                              <dt className="shrink-0 text-slate-600">source</dt>
                              <dd className="font-mono text-cyan-600/90 break-all">
                                {p.sourceSymbol}
                              </dd>
                            </div>
                            <div className="flex gap-2 min-w-0 sm:col-span-2">
                              <dt className="shrink-0 text-slate-600">where</dt>
                              <dd className="text-slate-400">{p.where}</dd>
                            </div>
                            <div className="flex gap-2 min-w-0 sm:col-span-2">
                              <dt className="shrink-0 text-slate-600">rank path</dt>
                              <dd className="text-emerald-500/90">
                                {p.affectsDiscoverRank
                                  ? 'Affects Discover rank (should never)'
                                  : 'Never writes of-record Discover scores'}
                              </dd>
                            </div>
                          </dl>
                          {p.systemExcerpt && (
                            <div>
                              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                System prompt (excerpt)
                              </p>
                              <pre className="max-h-56 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap">
                                {p.systemExcerpt}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {tab === 'funnel' && (
          <div className="space-y-4" data-testid="how-funnel">
            <p className="text-[12px] text-slate-500">
              Solo local funnel (this browser). Counts product events stored on-device — not multi-tenant
              analytics.
            </p>
            {funnel && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      ['discover_started', 'Discover started'],
                      ['discover_rank_completed', 'Rank completed'],
                      ['board_candidate_added', 'Board adds'],
                      ['pack_exported', 'Packs exported'],
                      ['pack_opened', 'Packs opened'],
                      ['source_deep_link_opened', 'Deep links'],
                    ] as const
                  ).map(([k, label]) => {
                    const n = funnel[k]
                    const empty = n == null || n === 0
                    return (
                      <div
                        key={k}
                        className={`rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 ${
                          empty ? 'opacity-30' : ''
                        }`}
                        data-empty={empty ? 'true' : undefined}
                      >
                        <p className="text-[10px] text-slate-500">{label}</p>
                        <p className="text-lg font-semibold tabular-nums text-slate-100">
                          {n == null ? '—' : n}
                        </p>
                      </div>
                    )
                  })}
                </div>
                {(() => {
                  const r = localFunnelRates(funnel)
                  const allZero =
                    funnel.discover_started === 0 &&
                    funnel.discover_rank_completed === 0 &&
                    funnel.board_candidate_added === 0 &&
                    funnel.pack_exported === 0
                  return (
                    <div
                      className={`rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-[12px] text-slate-400 space-y-1 ${
                        allZero ? 'opacity-30' : ''
                      }`}
                      data-empty={allZero ? 'true' : undefined}
                    >
                      <p className={!allZero && r.rankRate === 0 ? 'opacity-30' : ''}>
                        Rank rate:{' '}
                        <span className="text-slate-200 tabular-nums">
                          {(r.rankRate * 100).toFixed(0)}%
                        </span>{' '}
                        (ranks / starts)
                      </p>
                      <p className={!allZero && r.boardRate === 0 ? 'opacity-30' : ''}>
                        Board rate:{' '}
                        <span className="text-slate-200 tabular-nums">
                          {(r.boardRate * 100).toFixed(0)}%
                        </span>{' '}
                        (board adds / ranks)
                      </p>
                      <p className={!allZero && r.packRate === 0 ? 'opacity-30' : ''}>
                        Pack rate:{' '}
                        <span className="text-slate-200 tabular-nums">
                          {(r.packRate * 100).toFixed(0)}%
                        </span>{' '}
                        (exports / board adds)
                      </p>
                      <p className="text-[10px] text-slate-600 pt-1">
                        Updated {new Date(funnel.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  )
                })()}
                <button
                  type="button"
                  onClick={() => {
                    resetLocalFunnel()
                    setFunnel(loadLocalFunnel())
                  }}
                  className="text-[11px] text-slate-500 hover:text-rose-400"
                >
                  Reset local funnel
                </button>
              </>
            )}
          </div>
        )}

        <p className="mt-10 text-center text-[10px] text-slate-600 leading-relaxed">
          Source of truth lives in the repo under{' '}
          <code className="text-slate-500">src/lib/ai/</code>,{' '}
          <code className="text-slate-500">src/lib/discovery/</code>, and{' '}
          <code className="text-slate-500">docs/design/discovery-workbench-*.md</code>.
        </p>
      </div>
    </main>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  dim = false,
}: {
  active: boolean
  onClick: () => void
  label: string
  /** Empty surface count — dim at 0.3 */
  dim?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
        active
          ? 'border-indigo-500/60 bg-indigo-950/50 text-indigo-200'
          : 'border-slate-700 text-slate-500 hover:text-slate-300'
      } ${dim && !active ? 'opacity-30' : ''}`}
    >
      {label}
    </button>
  )
}
