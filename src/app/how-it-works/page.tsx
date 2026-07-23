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
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

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

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            How BioIntel is wired
          </h1>
          <HelperTip
            content="Transparent view of algorithms (deterministic, free public APIs) and AI prompts (claim-bound / evidence-gated). Nothing here invents Discover ranks."
            label="About this page"
            testId="how-page-lede-help"
          />
        </div>

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
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="text-[15px] font-semibold text-slate-100">How BioIntel works</h1>
              <HelperTip
                content="BioIntel is a solo discovery workbench over free public APIs. Of-record ranking is always deterministic. AI (your Ollama key) only runs claim-bound on packs, research hypotheses, and profile copilot — never in the Discover rank path."
                label="About BioIntel"
                testId="how-overview-lede-help"
                maxWidth="22rem"
              />
            </div>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Product law
            </h2>
            <ul className="flex flex-wrap gap-2">
              {PRODUCT_LAW_ROWS.map(([term, detail]) => (
                <li key={term}>
                  <HelperTip content={detail} label={term} testId={`how-law-${term}`}>
                    <span className="cursor-help rounded-full border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                      {term}
                    </span>
                  </HelperTip>
                </li>
              ))}
            </ul>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Two paths
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[12px] font-semibold text-emerald-300/90">Discover ranking</p>
                <HelperTip
                  content="Disease resolve → targets → gather candidates → PubChem identity for top-N → weighted multi-axis score → optional openFDA / literature harvest. Rubric weights are yours; the engine never invents axes. Everything is either a deterministic free-API pipeline or a gated AI surface — they never write each other's of-record scores."
                  label="About Discover ranking"
                  testId="how-discover-path-help"
                />
                <Link href="/discover" className="text-[11px] text-indigo-400 hover:underline">
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => setTab('algorithms')}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Algorithms
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[12px] font-semibold text-indigo-300/90">AI (BYOM Ollama)</p>
                <HelperTip
                  content={`Profile copilot, pack AI, RH seed, disease intelligence. Prompts inject retrieved public data only. System rules require panel citations; deep synthesis is refused when evidence is thin (${COPILOT_COMPLETENESS_GATE.minPanelsWithData}+ panels with data, ≥${Math.round(COPILOT_COMPLETENESS_GATE.minCompletenessRatio * 100)}% completeness).`}
                  label="About AI path"
                  testId="how-ai-path-help"
                />
                <button
                  type="button"
                  onClick={() => setTab('prompts')}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Prompts
                </button>
              </div>
            </div>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Discover pipeline
            </h2>
            <ol className="flex flex-wrap gap-2">
              {DISCOVER_PIPELINE_STAGES.map((s, i) => (
                <li key={s.id}>
                  <HelperTip
                    content={`${s.short}\n\n${s.detail || ''}\n\n${effortLabel(s.effort)} · ${s.sources.join(' · ')}`}
                    label={s.title}
                    testId={`how-pipeline-${s.id}`}
                    maxWidth="20rem"
                  >
                    <span className="cursor-help rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1 text-[11px] text-slate-200">
                      <span className="font-mono text-slate-600">{i + 1}.</span> {s.title}
                    </span>
                  </HelperTip>
                </li>
              ))}
            </ol>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              AI system rules
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-slate-300">Rules + completeness gate</span>
              <HelperTip
                content={`${COPILOT_SYSTEM_RULES_SUMMARY.join(' ')}\n\nCompleteness gate: ${COPILOT_COMPLETENESS_GATE.description}`}
                label="AI system rules"
                testId="how-ai-rules-help"
                maxWidth="22rem"
              />
            </div>

            <h2 className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Out of scope
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-slate-300">What we do not ship</span>
              <HelperTip
                content={`${NOT_WIRED.join('; ')}. UI empty states use opacity ~0.3 so filled signal stands out.`}
                label="Out of scope"
                testId="how-oos-help"
                maxWidth="22rem"
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => setTab('funnel')}
                className="text-indigo-400/90 hover:underline"
              >
                Your loop
              </button>
              <HelperTip
                content="Source of truth: docs/design/discovery-workbench-*.md, src/lib/discovery/, src/lib/ai/."
                label="Source of truth"
                testId="how-sot-help"
              />
            </div>
          </article>
        )}

        {tab === 'algorithms' && (
          <div className="space-y-2" data-testid="how-algorithms">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm font-semibold text-slate-100">Algorithms</h2>
              <HelperTip
                content="Each card is a real code path. Hover title for summary; open for step list and code areas."
                label="About algorithms"
                testId="how-algorithms-help"
              />
            </div>
            {ALGORITHM_CATALOG.map((algo) => {
              const open = openAlgo === algo.id
              const body = [
                algo.summary,
                'Steps:',
                ...algo.steps.map((st, i) => `${i + 1}. ${st}`),
                'Code areas:',
                ...algo.codeAreas,
              ].join('\n')
              return (
                <div
                  key={algo.id}
                  id={algo.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden scroll-mt-20"
                >
                  <div className="flex w-full items-center gap-2 px-4 py-3">
                    <HelperTip content={body} label={algo.title} maxWidth="22rem" testId={`how-algo-${algo.id}`}>
                      <span className="min-w-0 flex-1 cursor-help text-left">
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
                      </span>
                    </HelperTip>
                    <button
                      type="button"
                      onClick={() => setOpenAlgo(open ? null : algo.id)}
                      className="shrink-0 text-[10px] text-slate-500 hover:text-slate-300"
                      aria-expanded={open}
                    >
                      {open ? 'Hide steps' : 'Steps'}
                    </button>
                  </div>
                  {open && (
                    <div className="border-t border-slate-800 px-4 py-2 flex flex-wrap gap-1.5">
                      {algo.steps.map((st, i) => (
                        <HelperTip key={st} content={st} label={`Step ${i + 1}`}>
                          <span className="cursor-help rounded border border-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                            {i + 1}
                          </span>
                        </HelperTip>
                      ))}
                      {algo.codeAreas.map((c) => (
                        <StyledTooltip key={c} content={c}>
                          <span className="cursor-help rounded border border-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-cyan-600/90">
                            path
                          </span>
                        </StyledTooltip>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'prompts' && (
          <div className="space-y-2" data-testid="how-prompts">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-sm font-semibold text-slate-100">AI prompts</h2>
                <HelperTip
                  content="Dense catalog of modes sent to your Ollama model. User messages always include retrieved public data — not free invention. Expand a row for inputs, constraints, and system excerpts."
                  label="About prompts catalog"
                  testId="how-prompts-help"
                />
              </div>
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
                        </span>
                      </button>
                      {open && (
                        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 bg-slate-950/50 px-3 py-2 sm:px-4">
                          <HelperTip
                            content={p.purpose}
                            label="Purpose"
                            testId={`how-prompt-purpose-${p.id}`}
                          />
                          <HelperTip
                            content={p.inputs.map((i, n) => `${n + 1}. ${i}`).join('\n')}
                            label="Inputs"
                            testId={`how-prompt-inputs-${p.id}`}
                          />
                          <HelperTip
                            content={p.constraints.map((c, n) => `${n + 1}. ${c}`).join('\n')}
                            label="Constraints"
                            testId={`how-prompt-constraints-${p.id}`}
                          />
                          <HelperTip
                            content={[
                              `id: ${p.id}`,
                              `source: ${p.sourceSymbol}`,
                              `where: ${p.where}`,
                              p.affectsDiscoverRank
                                ? 'Affects Discover rank (should never)'
                                : 'Never writes of-record Discover scores',
                            ].join('\n')}
                            label="Meta"
                            testId={`how-prompt-meta-${p.id}`}
                          />
                          {p.systemExcerpt && (
                            <HelperTip
                              content={p.systemExcerpt}
                              label="System excerpt"
                              testId={`how-prompt-excerpt-${p.id}`}
                              maxWidth="22rem"
                            />
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
