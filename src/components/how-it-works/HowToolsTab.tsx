'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  RESEARCH_PLAYBOOKS,
  RESEARCH_TOOLS,
  researchGoalLabel,
  type ResearchGoal,
  type ToolChannel,
} from '@/lib/methods/researchToolCatalog'
import { HelperTip } from '@/components/ui/HelperTip'

const CHANNEL_LABELS: Record<ToolChannel, string> = {
  ui: 'UI',
  cli: 'CLI',
  copilot: 'Copilot',
  api: 'API',
  export: 'Export',
}

const GOAL_FILTER_ORDER: Array<ResearchGoal | 'all'> = [
  'all',
  'discover',
  'evidence',
  'compare',
  'pack',
  'hypothesis',
  'export',
  'ops',
]

export function HowToolsTab({
  initialPlaybookId = null,
}: {
  initialPlaybookId?: string | null
}) {
  const [openTool, setOpenTool] = useState<string | null>(null)
  const [openPlaybook, setOpenPlaybook] = useState<string | null>(initialPlaybookId)
  const [toolGoalFilter, setToolGoalFilter] = useState<ResearchGoal | 'all'>('all')
  const [toolChannelFilter, setToolChannelFilter] = useState<ToolChannel | 'all'>('all')

  const researchToolsFiltered = useMemo(() => {
    return RESEARCH_TOOLS.filter((t) => {
      if (toolGoalFilter !== 'all' && t.goal !== toolGoalFilter) return false
      if (toolChannelFilter !== 'all' && t.channel !== toolChannelFilter) return false
      return true
    })
  }, [toolGoalFilter, toolChannelFilter])

  return (
          <div className="space-y-8" data-testid="how-tools" id="tools">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm font-semibold text-slate-100">Research tools</h2>
              <HelperTip
                content="Shared map of UI, CLI, API, export, and allowlisted copilot tools so humans and agents accelerate scientific loops without thrashing or inventing ranks."
                label="About tools"
                testId="how-tools-help"
                maxWidth="22rem"
              />
              <span className="ml-auto text-[10px] tabular-nums text-slate-500">
                {researchToolsFiltered.length} of {RESEARCH_TOOLS.length}
              </span>
            </div>
            <p className="text-[12px] text-slate-500 max-w-3xl">
              Goal: faster, evidence-first research and engineering outcomes. Of-record work uses free public
              APIs and deterministic rank; AI tools are claim-bound and never rewrite Discover scores. Agents:{' '}
              <code className="text-slate-400">npm run biointel -- tools list</code>
              {' · '}
              <code className="text-slate-400">
                tools suggest --goal evidence --cid 2244
              </code>
              . Humans also see playbook tips on Discover idle/empty/results and project board empty/ready
              states.
            </p>

            <div className="flex flex-wrap gap-1.5" data-testid="how-tools-goal-filters">
              <span className="text-[10px] font-semibold uppercase text-slate-600 self-center">Goal</span>
              {GOAL_FILTER_ORDER.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setToolGoalFilter(g)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    toolGoalFilter === g
                      ? 'border-indigo-500/60 bg-indigo-950/40 text-indigo-200'
                      : 'border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {g === 'all' ? 'All' : researchGoalLabel(g)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" data-testid="how-tools-channel-filters">
              <span className="text-[10px] font-semibold uppercase text-slate-600 self-center">Channel</span>
              {(['all', 'ui', 'cli', 'copilot', 'api', 'export'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setToolChannelFilter(c)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    toolChannelFilter === c
                      ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-200'
                      : 'border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {c === 'all' ? 'All' : CHANNEL_LABELS[c]}
                </button>
              ))}
            </div>

            <ul
              className="divide-y divide-slate-800/80 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40"
              data-testid="how-tools-list"
            >
              {researchToolsFiltered.map((t) => {
                const open = openTool === t.id
                return (
                  <li key={t.id} className="bg-slate-900/30" data-testid={`tool-card-${t.id}`} id={t.id}>
                    <button
                      type="button"
                      onClick={() => setOpenTool(open ? null : t.id)}
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
                            {t.name}
                          </span>
                          <span className="rounded border border-slate-700/80 px-1 py-px text-[9px] text-slate-500">
                            {CHANNEL_LABELS[t.channel]}
                          </span>
                          <span className="rounded border border-indigo-900/50 px-1 py-px text-[9px] text-indigo-400/90">
                            {researchGoalLabel(t.goal)}
                          </span>
                          <span className="text-[9px] text-slate-600">{t.audience}</span>
                        </span>
                        <span className="mt-0.5 block text-[10px] text-slate-500 line-clamp-1">
                          {t.summary}
                        </span>
                      </span>
                    </button>
                    {open && (
                      <div className="space-y-2 border-t border-slate-800/60 px-3 py-2.5 text-[11px] text-slate-400">
                        <p>
                          <span className="font-semibold text-slate-300">When: </span>
                          {t.whenToUse}
                        </p>
                        {t.howHuman && (
                          <p>
                            <span className="font-semibold text-slate-300">Human: </span>
                            {t.howHuman}
                          </p>
                        )}
                        {t.howAgent && (
                          <p>
                            <span className="font-semibold text-slate-300">Agent: </span>
                            {t.howAgent}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold text-slate-300">Outcome: </span>
                          {t.outcome}
                        </p>
                        {t.cli && (
                          <p className="font-mono text-[10px] text-emerald-400/90">
                            biointel {t.cli}
                          </p>
                        )}
                        {t.productLawNote && (
                          <p className="text-amber-400/80">{t.productLawNote}</p>
                        )}
                        {t.href && (
                          <Link
                            href={t.href}
                            className="inline-block text-indigo-400 hover:underline"
                          >
                            Open surface →
                          </Link>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            <div id="playbooks" className="space-y-2 pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-sm font-semibold text-slate-100">Research playbooks</h2>
                <HelperTip
                  content="Step sequences that combine tools for scientific loops (not PR checklists). Agents: npm run biointel -- tools playbook <id>."
                  label="About playbooks"
                  testId="how-playbooks-help"
                />
              </div>
              <ul className="space-y-2" data-testid="how-playbooks-list">
                {RESEARCH_PLAYBOOKS.map((pb) => {
                  const open = openPlaybook === pb.id
                  return (
                    <li
                      key={pb.id}
                      id={pb.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/40"
                      data-testid={`playbook-card-${pb.id}`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenPlaybook(open ? null : pb.id)}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-800/30"
                        aria-expanded={open}
                      >
                        <span
                          className={`mt-0.5 shrink-0 text-[10px] text-slate-600 transition-transform ${
                            open ? 'rotate-90' : ''
                          }`}
                        >
                          ▸
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[13px] font-medium text-slate-100">{pb.title}</span>
                            <span className="text-[9px] text-slate-500">{pb.audience}</span>
                            <span className="font-mono text-[9px] text-slate-600">{pb.id}</span>
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">{pb.goal}</span>
                        </span>
                      </button>
                      {open && (
                        <div className="space-y-3 border-t border-slate-800 px-3 py-3 text-[11px] text-slate-400">
                          <ol className="list-decimal space-y-2 pl-4">
                            {pb.steps.map((s) => (
                              <li key={s.title}>
                                <span className="font-medium text-slate-200">{s.title}</span>
                                {s.human && (
                                  <p className="mt-0.5">
                                    <span className="text-slate-500">Human: </span>
                                    {s.human}
                                  </p>
                                )}
                                {s.agent && (
                                  <p className="mt-0.5">
                                    <span className="text-slate-500">Agent: </span>
                                    {s.agent}
                                  </p>
                                )}
                                {s.tools.length > 0 && (
                                  <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                                    {s.tools.join(' · ')}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ol>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              Success
                            </p>
                            <ul className="mt-1 list-disc pl-4">
                              {pb.successSignals.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/80">
                              Law
                            </p>
                            <ul className="mt-1 list-disc pl-4 text-amber-400/70">
                              {pb.lawReminders.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
  )
}
