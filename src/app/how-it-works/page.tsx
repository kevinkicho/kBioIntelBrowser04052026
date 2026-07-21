'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ALGORITHM_CATALOG,
  COPILOT_COMPLETENESS_GATE,
  COPILOT_SYSTEM_RULES_SUMMARY,
  PRODUCT_LAW_BULLETS,
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
  'LLM inventing Discover ranks or composite scores',
  'Paid commercial compound databases as product requirements',
  'Regulatory decision support or “this drug works” language',
  'Full 15-panel pack fetch for board density (Core panels only)',
  'Multi-tenant cloud board as a requirement (solo + export default)',
  'De novo generative chemistry / biologics-first entity model',
] as const

const EMPTY_OPACITY_PATTERN =
  'UI pattern: tabs, glance tiles, and empty panels use opacity ~0.3 when count is 0 so signal stands out.'

type TabId = 'overview' | 'algorithms' | 'prompts' | 'funnel'

export default function HowItWorksPage() {
  const [tab, setTab] = useState<TabId>('overview')
  const [promptFilter, setPromptFilter] = useState<PromptSurface | 'all'>('all')
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

  const prompts = useMemo(() => {
    if (promptFilter === 'all') return PROMPT_CATALOG
    return PROMPT_CATALOG.filter((p) => p.surface === promptFilter)
  }, [promptFilter])

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
          <div className="space-y-5" data-testid="how-overview">
            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold text-slate-100 mb-3">Product law</h2>
              <ul className="space-y-2">
                {PRODUCT_LAW_BULLETS.map((b) => (
                  <li key={b} className="flex gap-2 text-[13px] text-slate-400 leading-snug">
                    <span className="text-emerald-500 shrink-0">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold text-slate-100 mb-2">Two wiring paths</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
                  <p className="text-xs font-semibold text-emerald-300 mb-1">Discover ranking</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Multi-source gather → identity resolve → weighted multi-axis score → optional
                    safety harvest. Fully deterministic. See Algorithms tab.
                  </p>
                  <Link
                    href="/discover"
                    className="mt-2 inline-block text-[11px] text-indigo-400 hover:underline"
                  >
                    Open Discover →
                  </Link>
                </div>
                <div className="rounded-lg border border-indigo-900/40 bg-indigo-950/20 p-3">
                  <p className="text-xs font-semibold text-indigo-300 mb-1">AI (Ollama Cloud)</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Profile copilot, pack AI, hypothesis seed. System rules force citations and
                    completeness gates. Never writes Discover composite scores.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold text-slate-100 mb-2">Copilot system rules</h2>
              <ol className="list-decimal list-inside space-y-1.5 text-[12px] text-slate-400">
                {COPILOT_SYSTEM_RULES_SUMMARY.map((r) => (
                  <li key={r} className="leading-snug">
                    {r}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[11px] text-amber-200/80 border border-amber-900/40 bg-amber-950/20 rounded-lg px-3 py-2">
                Completeness gate: {COPILOT_COMPLETENESS_GATE.description}
              </p>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold text-slate-100 mb-3">Discover pipeline at a glance</h2>
              <ol className="space-y-2">
                {DISCOVER_PIPELINE_STAGES.map((s, i) => (
                  <li key={s.id} className="flex gap-2 text-[12px]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-mono text-indigo-300">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-medium text-slate-200">{s.title}</span>
                      <span className="text-slate-500"> — {s.short}</span>
                      <span className="block text-[10px] text-slate-600">
                        {effortLabel(s.effort)} · {s.sources.join(' · ')}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-xl border border-rose-900/30 bg-rose-950/10 p-5">
              <h2 className="text-sm font-semibold text-rose-200/90 mb-2">What is not wired</h2>
              <p className="text-[11px] text-slate-500 mb-2">
                Explicit non-goals (screenshot-friendly for collaborators / IRBs).
              </p>
              <ul className="space-y-1.5">
                {NOT_WIRED.map((b) => (
                  <li key={b} className="flex gap-2 text-[12px] text-slate-400">
                    <span className="text-rose-500/80 shrink-0">✕</span>
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] text-slate-600">{EMPTY_OPACITY_PATTERN}</p>
            </section>
          </div>
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
          <div className="space-y-3" data-testid="how-prompts">
            <p className="text-[12px] text-slate-500">
              Modes the app can send to your Ollama Cloud model. User messages always include{' '}
              <em className="text-slate-400">retrieved public data</em> for that entity — not free
              invention.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-2">
              <FilterChip
                active={promptFilter === 'all'}
                onClick={() => setPromptFilter('all')}
                label="All"
              />
              {(Object.keys(SURFACE_LABELS) as PromptSurface[]).map((s) => (
                <FilterChip
                  key={s}
                  active={promptFilter === s}
                  onClick={() => setPromptFilter(s)}
                  label={SURFACE_LABELS[s]}
                />
              ))}
            </div>

            {prompts.map((p) => {
              const open = openPrompt === p.id
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
                  data-testid={`prompt-card-${p.id}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenPrompt(open ? null : p.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-800/30"
                    aria-expanded={open}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">{p.label}</span>
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] text-slate-500">
                          {SURFACE_LABELS[p.surface]}
                        </span>
                        {!p.affectsDiscoverRank && (
                          <span className="text-[9px] text-emerald-600/90">≠ rank path</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">{p.where}</span>
                      <span className="mt-1 block text-[12px] text-slate-400 leading-snug">
                        {p.purpose}
                      </span>
                    </span>
                    <span className={`text-slate-500 ${open ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-800 px-4 py-3 space-y-3 text-[12px]">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">
                          Inputs to the model
                        </p>
                        <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                          {p.inputs.map((i) => (
                            <li key={i}>{i}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">
                          Constraints
                        </p>
                        <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                          {p.constraints.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="font-mono text-[10px] text-cyan-700">
                        source: {p.sourceSymbol}
                      </p>
                      {p.systemExcerpt && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">
                            System prompt (excerpt)
                          </p>
                          <pre className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap">
                            {p.systemExcerpt}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
                  ).map(([k, label]) => (
                    <div
                      key={k}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
                    >
                      <p className="text-[10px] text-slate-500">{label}</p>
                      <p className="text-lg font-semibold tabular-nums text-slate-100">
                        {funnel[k]}
                      </p>
                    </div>
                  ))}
                </div>
                {(() => {
                  const r = localFunnelRates(funnel)
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-[12px] text-slate-400 space-y-1">
                      <p>
                        Rank rate:{' '}
                        <span className="text-slate-200 tabular-nums">
                          {(r.rankRate * 100).toFixed(0)}%
                        </span>{' '}
                        (ranks / starts)
                      </p>
                      <p>
                        Board rate:{' '}
                        <span className="text-slate-200 tabular-nums">
                          {(r.boardRate * 100).toFixed(0)}%
                        </span>{' '}
                        (board adds / ranks)
                      </p>
                      <p>
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
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
        active
          ? 'border-indigo-500/60 bg-indigo-950/50 text-indigo-200'
          : 'border-slate-700 text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  )
}
