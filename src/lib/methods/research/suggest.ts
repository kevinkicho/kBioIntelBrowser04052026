/** Goal → next actions for humans + agents. */
import type { ResearchGoal, ResearchToolEntry } from './types'
import { researchGoalLabel } from './types'
import { researchToolsByGoal } from './playbooks'
import { researchPlaybookById } from './playbooks'

/** Map research goals → primary playbook + where to start in its steps. */
export const GOAL_PLAYBOOK_MAP: Record<
  ResearchGoal,
  { playbookId: string; stepOffset: number; blurb: string }
> = {
  discover: {
    playbookId: 'disease_to_shortlist',
    stepOffset: 0,
    blurb: 'Disease query → deterministic rank → densify → save to project.',
  },
  evidence: {
    playbookId: 'cid_evidence_deep_dive',
    stepOffset: 0,
    blurb: 'Profile categories → close gaps → ledger/kit → optional claim-bound AI.',
  },
  compare: {
    playbookId: 'compare_and_choose',
    stepOffset: 0,
    blurb: 'Session set → side-by-side hub → human board decision.',
  },
  pack: {
    playbookId: 'board_pack_to_rh',
    stepOffset: 0,
    blurb: 'Promote → pack extract → optional pack AI → RH seed.',
  },
  hypothesis: {
    playbookId: 'board_pack_to_rh',
    stepOffset: 2,
    blurb: 'From an existing pack: pack AI + claim-bound research hypothesis.',
  },
  export: {
    playbookId: 'cid_evidence_deep_dive',
    stepOffset: 2,
    blurb: 'Freeze of-record research kit for offline / grant / archive.',
  },
  ops: {
    playbookId: 'agent_ops_loop',
    stepOffset: 0,
    blurb: 'Health → research action → logs → quality gate.',
  },
}

export const RESEARCH_GOALS: ResearchGoal[] = [
  'discover',
  'evidence',
  'compare',
  'pack',
  'hypothesis',
  'export',
  'ops',
]

export function isResearchGoal(s: string): s is ResearchGoal {
  return (RESEARCH_GOALS as string[]).includes(s)
}

export interface SuggestVars {
  /** Disease / discover query */
  q?: string
  /** Comma-separated gene symbols */
  targets?: string
  /** PubChem CID */
  cid?: string
  /** Local project id */
  projectId?: string
}

export interface SuggestedAction {
  /** 1-based rank among suggestions */
  rank: number
  /** Human-readable step title */
  title: string
  /** Human UI guidance */
  human?: string
  /** Agent/CLI guidance (interpolated) */
  agent?: string
  /** Runnable npm biointel line when derivable */
  cli?: string
  toolIds: string[]
}

export interface ResearchSuggestion {
  goal: ResearchGoal
  goalLabel: string
  blurb: string
  playbookId: string
  playbookTitle: string
  href: string
  actions: SuggestedAction[]
  lawReminders: string[]
  /** Related tools for this goal (catalog) */
  tools: ResearchToolEntry[]
}

const DEFAULT_Q = 'ATTR amyloidosis'
const DEFAULT_TARGETS = 'TTR'
const DEFAULT_CID = '2244'

function interpolate(template: string, vars: SuggestVars): string {
  const q = vars.q?.trim() || DEFAULT_Q
  const targets = vars.targets?.trim() || DEFAULT_TARGETS
  const cid = vars.cid?.trim() || DEFAULT_CID
  const projectId = vars.projectId?.trim() || '<projectId>'
  return template
    .replace(/\{\{q\}\}/g, q)
    .replace(/\{\{targets\}\}/g, targets)
    .replace(/\{\{cid\}\}/g, cid)
    .replace(/\{\{projectId\}\}/g, projectId)
    .replace(/…/g, q === DEFAULT_Q ? '…' : q)
}

/**
 * Turn a free-form agent step into a `npm run biointel -- …` command when possible.
 */
export function agentStepToCli(agent: string, vars: SuggestVars = {}): string | undefined {
  const raw = interpolate(agent, vars).trim()
  const lower = raw.toLowerCase()

  // Already a full biointel invocation
  if (lower.startsWith('npm run biointel')) return raw
  if (lower.startsWith('biointel ')) {
    return `npm run biointel -- ${raw.slice('biointel '.length)}`
  }

  // discover rank / densify / harvest
  if (/\bdiscover\s+rank\b/i.test(raw) || /rank\s+--q/i.test(raw)) {
    const q = vars.q?.trim() || DEFAULT_Q
    const targets = vars.targets?.trim()
    const t = targets ? ` --targets ${targets}` : ` --targets ${DEFAULT_TARGETS}`
    return `npm run biointel -- discover rank --q "${q}"${t}`
  }
  if (/\bdiscover\s+densify\b/i.test(raw) || /\bdensify\b/i.test(raw)) {
    const q = vars.q?.trim() || DEFAULT_Q
    return `npm run biointel -- discover densify --q "${q}"`
  }
  if (/\bharvest\b/i.test(raw) && /names/i.test(raw)) {
    return `npm run biointel -- discover harvest --names "Tafamidis,Diflunisal" --safety`
  }

  // molecule / research kit
  if (/\bresearch\s+kit\b/i.test(raw) || /\bkit\.json\b/i.test(raw)) {
    const cid = vars.cid?.trim() || DEFAULT_CID
    return `npm run biointel -- research kit --cid ${cid} --out kit.json`
  }
  if (/\bmolecule\s+get\b/i.test(raw)) {
    const cid = vars.cid?.trim() || DEFAULT_CID
    return `npm run biointel -- molecule get ${cid}`
  }
  if (/\bmolecule\s+category\b/i.test(raw)) {
    const cid = vars.cid?.trim() || DEFAULT_CID
    return `npm run biointel -- molecule category ${cid} pharmaceutical`
  }

  // orphanet
  if (/\borphanet\b/i.test(raw)) {
    const q = vars.q?.trim() || DEFAULT_Q
    return `npm run biointel -- orphanet genes --q "${q}"`
  }

  // logs / health / gate
  if (/\blogs\s+grep\b/i.test(raw) || /product\.discover/i.test(raw)) {
    return `npm run biointel -- logs grep product.discover`
  }
  if (/\blogs\s+tail\b/i.test(raw)) {
    return `npm run biointel -- logs tail --n 40`
  }
  if (/\bhealth\b/i.test(raw) && !/mental/i.test(raw)) {
    return `npm run biointel -- health`
  }
  if (/\bgate\b/i.test(raw)) {
    return `npm run biointel -- gate`
  }
  if (/\be2e\b/i.test(raw)) {
    return `npm run biointel -- e2e auto`
  }
  if (/\btools\s+playbook\b/i.test(raw)) {
    const m = raw.match(/tools\s+playbook\s+([a-z0-9_]+)/i)
    const id = m?.[1] || 'disease_to_shortlist'
    return `npm run biointel -- tools playbook ${id}`
  }
  if (/\btools\s+list\b/i.test(raw)) {
    return `npm run biointel -- tools list`
  }
  if (/\btools\s+suggest\b/i.test(raw)) {
    return `npm run biointel -- tools suggest --goal discover --q "{{q}}"`
  }
  if (/\btools\s+copilot\b/i.test(raw)) {
    return `npm run biointel -- tools copilot`
  }

  return undefined
}

/**
 * Suggest the next N research actions for a goal (humans + agents).
 * Used by UI playbook tips and `biointel tools suggest --goal …`.
 */
export function suggestResearchForGoal(
  goal: ResearchGoal,
  opts: { limit?: number; vars?: SuggestVars; stepOffset?: number } = {},
): ResearchSuggestion {
  const meta = GOAL_PLAYBOOK_MAP[goal]
  const limit = Math.min(Math.max(opts.limit ?? 3, 1), 8)
  const stepOffset = opts.stepOffset ?? meta.stepOffset
  const vars = opts.vars ?? {}
  const pb = researchPlaybookById(meta.playbookId)
  if (!pb) {
    return {
      goal,
      goalLabel: researchGoalLabel(goal),
      blurb: meta.blurb,
      playbookId: meta.playbookId,
      playbookTitle: meta.playbookId,
      href: `/how-it-works#${meta.playbookId}`,
      actions: [],
      lawReminders: [],
      tools: researchToolsByGoal(goal).slice(0, 6),
    }
  }

  const slice = pb.steps.slice(stepOffset, stepOffset + limit)
  const actions: SuggestedAction[] = slice.map((s, i) => {
    const agent = s.agent ? interpolate(s.agent, vars) : undefined
    return {
      rank: i + 1,
      title: s.title,
      human: s.human ? interpolate(s.human, vars) : undefined,
      agent,
      cli: agent ? agentStepToCli(agent, vars) : undefined,
      toolIds: s.tools,
    }
  })

  // If playbook steps are thin on CLI, pad with goal-scoped tools that have cli fields
  if (actions.filter((a) => a.cli).length < Math.min(2, limit)) {
    const cliTools = researchToolsByGoal(goal).filter((t) => t.cli)
    for (const t of cliTools) {
      if (actions.length >= limit) break
      if (actions.some((a) => a.cli?.includes(t.cli!.split(' ')[0]))) continue
      const cmd = `npm run biointel -- ${interpolate(t.cli!, vars)}`
      if (actions.some((a) => a.cli === cmd)) continue
      actions.push({
        rank: actions.length + 1,
        title: t.name,
        human: t.howHuman,
        agent: t.howAgent,
        cli: cmd,
        toolIds: [t.id],
      })
    }
  }

  return {
    goal,
    goalLabel: researchGoalLabel(goal),
    blurb: meta.blurb,
    playbookId: pb.id,
    playbookTitle: pb.title,
    href: `/how-it-works#${pb.id}`,
    actions: actions.slice(0, limit).map((a, i) => ({ ...a, rank: i + 1 })),
    lawReminders: pb.lawReminders,
    tools: researchToolsByGoal(goal).slice(0, 8),
  }
}

