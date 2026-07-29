/** CLI JSON export payload (npm run export:research-catalog). */
import { COPILOT_TOOLS } from '@/lib/ai/copilot/tools/catalog'
import type { ResearchGoal, ToolAudience } from './types'
import { RESEARCH_PLAYBOOKS, researchToolsByGoal } from './playbooks'
import { SURFACE_RESEARCH_TOOLS } from './tools'
import {
  GOAL_PLAYBOOK_MAP,
  RESEARCH_GOALS,
  agentStepToCli,
  suggestResearchForGoal,
  type SuggestVars,
} from './suggest'


// ── CLI export payload (single source for researchPlaybooks.json) ───────────

export interface ResearchCatalogExport {
  version: number
  playbooks: Array<{
    id: string
    title: string
    audience: ToolAudience
    goal: string
    steps: Array<{ title: string; human?: string; agent?: string; tools?: string[] }>
    successSignals: string[]
    lawReminders: string[]
  }>
  cliTools: Array<{ cmd: string; goal: ResearchGoal; summary: string }>
  copilotTools: string[]
  goalMap: Record<
    ResearchGoal,
    { playbookId: string; stepOffset: number; blurb: string }
  >
  /** Precomputed from suggestResearchForGoal — CLI must not reimplement suggest. */
  suggestCommands: Record<ResearchGoal, string[]>
}

/**
 * Build the JSON document written by `npm run export:research-catalog`.
 * CLI `tools suggest` reads suggestCommands from that file — same algorithm as UI.
 */
export function buildResearchCatalogExport(): ResearchCatalogExport {
  const suggestCommands = {} as Record<ResearchGoal, string[]>
  // Placeholders so CLI can substitute --q / --cid / --targets without reimplementing suggest.
  const placeholderVars: SuggestVars = {
    q: '{{q}}',
    targets: '{{targets}}',
    cid: '{{cid}}',
    projectId: '{{projectId}}',
  }
  for (const g of RESEARCH_GOALS) {
    // Prefer more steps so we still get 3 runnable CLIs after dropping non-CLI agent notes.
    const s = suggestResearchForGoal(g, { limit: 6, vars: placeholderVars })
    const bare: string[] = []
    for (const a of s.actions) {
      if (!a.cli) continue
      const cmd = a.cli.replace(/^npm run biointel --\s*/i, '')
      if (cmd && !bare.includes(cmd)) bare.push(cmd)
      if (bare.length >= 3) break
    }
    // Pad from goal-scoped tools using the same agentStepToCli normalizer
    if (bare.length < 3) {
      const padPool = [
        ...researchToolsByGoal(g),
        // hypothesis/pack steps are often UI-only — allow pack + ops CLI pads
        ...(g === 'hypothesis' || g === 'pack' ? researchToolsByGoal('pack') : []),
        ...researchToolsByGoal('ops'),
      ]
      for (const t of padPool) {
        const seed = (t.cli || t.howAgent || '')
          .replace(/<query>/gi, '{{q}}')
          .replace(/--cid <n>/gi, '--cid {{cid}}')
          .replace(/<cid>/gi, '{{cid}}')
          .replace(/<categoryId>/gi, 'pharmaceutical')
        if (!seed) continue
        const full = agentStepToCli(seed, placeholderVars)
        if (!full) continue
        const cmd = full.replace(/^npm run biointel --\s*/i, '')
        if (cmd && !bare.includes(cmd)) bare.push(cmd)
        if (bare.length >= 3) break
      }
    }
    // Last-resort universal agent commands (playbook id matches the goal)
    if (bare.length < 3) {
      for (const fb of [
        `tools playbook ${GOAL_PLAYBOOK_MAP[g].playbookId}`,
        'tools copilot',
        'health',
        'logs tail --n 40',
      ]) {
        if (!bare.includes(fb)) bare.push(fb)
        if (bare.length >= 3) break
      }
    }
    suggestCommands[g] = bare
  }

  return {
    version: 1,
    playbooks: RESEARCH_PLAYBOOKS.map((p) => ({
      id: p.id,
      title: p.title,
      audience: p.audience,
      goal: p.goal,
      steps: p.steps.map((st) => ({
        title: st.title,
        human: st.human,
        agent: st.agent,
        tools: st.tools,
      })),
      successSignals: p.successSignals,
      lawReminders: p.lawReminders,
    })),
    cliTools: SURFACE_RESEARCH_TOOLS.filter((t) => t.cli).map((t) => ({
      cmd: t.cli!,
      goal: t.goal,
      summary: t.summary,
    })),
    copilotTools: COPILOT_TOOLS.map((t) => t.name),
    goalMap: { ...GOAL_PLAYBOOK_MAP },
    suggestCommands,
  }
}

