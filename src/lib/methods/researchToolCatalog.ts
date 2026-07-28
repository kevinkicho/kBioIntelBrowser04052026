/**
 * Research tool catalog — human + agent surfaces for accelerating scientific work.
 *
 * Pure data: no network. Used by /how-it-works (Tools tab), copilot Ask tips,
 * and mirrored in `biointel tools` CLI help.
 *
 * Product law: free public APIs; deterministic Discover rank; AI claim-bound only.
 */

import {
  COPILOT_MAX_TOOL_STEPS,
  COPILOT_TOOLS,
  type CopilotToolName,
} from '@/lib/ai/copilot/tools/catalog'

export type ToolAudience = 'human' | 'agent' | 'both'
export type ToolChannel = 'ui' | 'cli' | 'copilot' | 'api' | 'export'
export type ResearchGoal =
  | 'discover'
  | 'evidence'
  | 'compare'
  | 'pack'
  | 'hypothesis'
  | 'export'
  | 'ops'

export interface ResearchToolEntry {
  id: string
  name: string
  channel: ToolChannel
  audience: ToolAudience
  goal: ResearchGoal
  summary: string
  /** When a researcher or agent should pick this tool */
  whenToUse: string
  /** Human path (UI clicks / exports) */
  howHuman?: string
  /** Agent path (CLI / HTTP / allowlisted copilot tools) */
  howAgent?: string
  /** What positive research outcome looks like */
  outcome: string
  href?: string
  cli?: string
  copilotTool?: CopilotToolName
  productLawNote?: string
}

export interface ResearchPlaybookStep {
  title: string
  human?: string
  agent?: string
  /** Research tool entry ids */
  tools: string[]
}

export interface ResearchPlaybook {
  id: string
  title: string
  audience: ToolAudience
  /** One-line scientific / engineering goal */
  goal: string
  steps: ResearchPlaybookStep[]
  successSignals: string[]
  lawReminders: string[]
}

const GOAL_LABELS: Record<ResearchGoal, string> = {
  discover: 'Discover shortlist',
  evidence: 'Evidence densify',
  compare: 'Compare candidates',
  pack: 'Board pack',
  hypothesis: 'Research hypothesis',
  export: 'Export / kit',
  ops: 'Ops / quality',
}

export function researchGoalLabel(g: ResearchGoal): string {
  return GOAL_LABELS[g]
}

/** Allowlisted copilot tools as research-tool entries (single source: COPILOT_TOOLS). */
export const COPILOT_RESEARCH_TOOLS: ResearchToolEntry[] = COPILOT_TOOLS.map((t) => ({
  id: `copilot_${t.name}`,
  name: t.name,
  channel: 'copilot' as const,
  audience: 'both' as const,
  goal: copilotToolGoal(t.name),
  summary: t.description,
  whenToUse: copilotToolWhen(t.name),
  howHuman: 'Open AI Copilot → Ask on a profile page; ask in plain language (model may call this tool).',
  howAgent: `Agent loop only — model emits \`\`\`tool {"name":"${t.name}",...}\`\`\` (max ${COPILOT_MAX_TOOL_STEPS} steps).`,
  outcome: copilotToolOutcome(t.name),
  copilotTool: t.name,
  href: undefined,
  productLawNote: 'Evidence-bound; never changes Discover of-record ranks.',
}))

function copilotToolGoal(name: CopilotToolName): ResearchGoal {
  switch (name) {
    case 'get_pack_claims':
    case 'seed_research_hypothesis':
      return name === 'seed_research_hypothesis' ? 'hypothesis' : 'pack'
    case 'compare_board':
    case 'list_session_molecules':
      return 'compare'
    case 'suggest_next_actions':
    case 'fix_gap':
    case 'retry_category':
    case 'load_category':
    case 'open_panel':
      return 'evidence'
    default:
      return 'evidence'
  }
}

function copilotToolWhen(name: CopilotToolName): string {
  switch (name) {
    case 'get_retrieval_snapshot':
      return 'Before synthesizing: check what is loaded vs empty/timeout/error.'
    case 'get_panel_summary':
      return 'Need sample rows or counts from one panel without inventing data.'
    case 'list_loaded_categories':
      return 'Diagnose which profile categories are idle/loading/error.'
    case 'retry_category':
    case 'load_category':
    case 'fix_gap':
      return 'Act on a real gap so the next answer can cite more evidence.'
    case 'open_panel':
      return 'User wants the UI focused on a specific evidence panel.'
    case 'list_session_molecules':
      return 'Compare questions across recently viewed molecules.'
    case 'suggest_next_actions':
      return 'Deterministic next fetches from retrieval state (no LLM invention).'
    case 'get_pack_claims':
      return 'Inspect claim ids / promote-set tags before pack AI or RH seed.'
    case 'seed_research_hypothesis':
      return 'Draft claim-bound RH scaffold from the latest pack.'
    case 'compare_board':
      return 'Board status / scores / CIDs across candidates on a project.'
    default:
      return 'Evidence-bound agent step on profile or project context.'
  }
}

function copilotToolOutcome(name: CopilotToolName): string {
  switch (name) {
    case 'get_retrieval_snapshot':
      return 'Honest completeness counts and top gaps for the current profile.'
    case 'get_panel_summary':
      return 'Counts + sample rows from a loaded panel only.'
    case 'retry_category':
    case 'load_category':
    case 'fix_gap':
      return 'Category re-fetch or load started; panels may populate after.'
    case 'seed_research_hypothesis':
      return 'Local RH draft with claim-bound scaffold (user verifies).'
    case 'get_pack_claims':
      return 'Local pack claim index summary — no invented claims.'
    case 'compare_board':
      return 'Tabular board compare from local project store.'
    default:
      return 'Observation for the agent turn; user still verifies before wet-lab use.'
  }
}

/** UI / CLI / API / export tools that accelerate research loops. */
export const SURFACE_RESEARCH_TOOLS: ResearchToolEntry[] = [
  {
    id: 'ui_discover_rank',
    name: 'Discover rank',
    channel: 'ui',
    audience: 'both',
    goal: 'discover',
    summary:
      'Deterministic multi-axis shortlist from disease/query + optional targets over free public APIs.',
    whenToUse: 'Start of a therapeutic or repurposing investigation; need ranked candidates.',
    howHuman: 'Open /discover → disease query → pin targets → Rank. Inspect Why ranked chips + score math tooltips.',
    howAgent: 'npm run biointel -- discover rank --q "…" --targets TTR,EGFR',
    outcome: 'Scored shortlist with provenance sources; of-record scores never from LLM.',
    href: '/discover',
    cli: 'discover rank --q <query> [--targets A,B] [--limit 15]',
    productLawNote: 'No LLM in rank path.',
  },
  {
    id: 'ui_discover_densify',
    name: 'Densify shortlist',
    channel: 'ui',
    audience: 'both',
    goal: 'evidence',
    summary: 'FAERS + EuropePMC (+ optional multi-source breadth) harvest on top-K candidates.',
    whenToUse: 'After rank when safety/novelty axes look thin or board promotion needs denser evidence.',
    howHuman: 'Discover run → densify / safety harvest controls; board promote triggers harvest pipeline.',
    howAgent: 'npm run biointel -- discover densify --q "…"  (server densifies top-K)',
    outcome: 'Richer safety/novelty axes + harvest provenance for promote-set decisions.',
    href: '/discover',
    cli: 'discover densify --q <query>',
  },
  {
    id: 'ui_orphanet_pins',
    name: 'Orphanet gene pins',
    channel: 'ui',
    audience: 'both',
    goal: 'discover',
    summary: 'Rare-disease gene pins from Orphanet (ORPHA codes) for rare persona boosts.',
    whenToUse: 'Rare disease path (ATTR, CF, …) when you need gene pins with Orphanet provenance.',
    howHuman: 'Discover rare tour / Orphanet boost; confirm ORPHA code on UI.',
    howAgent: 'npm run biointel -- orphanet genes --q "ATTR amyloidosis"',
    outcome: 'Gene pins with ORPHA provenance for re-rank when user accepts.',
    href: '/discover',
    cli: 'orphanet genes --q <disease>',
  },
  {
    id: 'ui_molecule_profile',
    name: 'Molecule profile + data hub',
    channel: 'ui',
    audience: 'human',
    goal: 'evidence',
    summary: 'Of-record Fact|Value|Source|Open ledger, category panels, Research view.',
    whenToUse: 'Deep-dive a CID after shortlist; need citable facts not AI narrative.',
    howHuman: 'Open molecule profile → Research / Data hub ledger → export CSV/TSV or Research kit.',
    howAgent: 'npm run biointel -- molecule get <cid>; molecule category <cid> pharmaceutical',
    outcome: 'Of-record facts with openable sources; empty means not retrieved.',
    href: '/methodology',
    cli: 'molecule category <cid> <categoryId>',
  },
  {
    id: 'cli_research_kit',
    name: 'Research kit export',
    channel: 'export',
    audience: 'both',
    goal: 'export',
    summary: 'Multi-file of-record research kit bundle for offline analysis / grants / archives.',
    whenToUse: 'Freeze evidence snapshot for a molecule before wet-lab or collaboration.',
    howHuman: 'Profile Research → Research kit download; optional kit-diff on /methodology#kit-diff.',
    howAgent: 'npm run biointel -- research kit --cid <n> --out kit.json',
    outcome: 'biointel-research-kit-bundle JSON with facts, sources, content hashes.',
    href: '/methodology#kit-diff',
    cli: 'research kit --cid <n> [--out file.json] [--categories a,b]',
  },
  {
    id: 'ui_compare_hub',
    name: 'Compare side-by-side hub',
    channel: 'ui',
    audience: 'human',
    goal: 'compare',
    summary: 'Of-record compare across molecules/genes with dual strip + hub facts.',
    whenToUse: 'Pick between 2–N shortlist candidates with shared axes and sources.',
    howHuman: 'Session history / compare entry → side-by-side hub; export if needed.',
    outcome: 'Transparent side-by-side facts; AI views labeled non-of-record if used.',
    href: '/compare',
  },
  {
    id: 'ui_board_pack',
    name: 'Board pack extract',
    channel: 'ui',
    audience: 'both',
    goal: 'pack',
    summary: 'Promote-set → Core panel extract → citable claims (max 5 extractors).',
    whenToUse: 'Need a board-ready evidence pack from project candidates.',
    howHuman: 'Project board → Promote → Build pack → download; check claim/citable counts.',
    howAgent: 'Use project store + pack pipelines in app; verify M3 citable via events/logs.',
    outcome: 'Pack with subjectCandidateId preserved; density warning if thin.',
    href: '/projects',
    productLawNote: '5 extractor panels max; no full 15-panel pack fetch.',
  },
  {
    id: 'ui_pack_ai',
    name: 'Pack AI (claim-bound)',
    channel: 'ui',
    audience: 'both',
    goal: 'pack',
    summary: 'Structured pack modes (gap, brief, next experiment, red team) on allowlisted claims only.',
    whenToUse: 'After pack has enough citable claims; want non-of-record synthesis.',
    howHuman: 'Project pack → AI modes; verify every claim id against pack.',
    howAgent: 'POST /api/ai/pack with mode + pack context; validatePackAiOutput fails closed.',
    outcome: 'Claim-bound narrative; unknown claim ids stripped/refused.',
    href: '/how-it-works',
    productLawNote: 'Non-of-record; does not rewrite deterministic scores.',
  },
  {
    id: 'ui_research_hypothesis',
    name: 'Research hypothesis seed',
    channel: 'ui',
    audience: 'both',
    goal: 'hypothesis',
    summary: 'Claim-bound RH scaffold from pack (not set-ops /hypothesis).',
    whenToUse: 'Turn pack evidence into a draft investigation thesis.',
    howHuman: 'Project → Research Hypothesis from pack; edit statements; rehydrate claims.',
    howAgent: 'Copilot tool seed_research_hypothesis with projectId; or local RH helpers.',
    outcome: 'Local RH with claim links; user verifies before grant/wet-lab language.',
    href: '/projects',
    copilotTool: 'seed_research_hypothesis',
  },
  {
    id: 'ui_ai_copilot',
    name: 'Profile AI Copilot (Ask)',
    channel: 'copilot',
    audience: 'human',
    goal: 'evidence',
    summary: `BYOM Ollama copilot with ≤${COPILOT_MAX_TOOL_STEPS} evidence tools per question.`,
    whenToUse: 'Interpret loaded panels, gaps, safety/MoA questions with citations.',
    howHuman: 'Profile FAB → Ask; configure AI key in header; use Monitor for gaps first.',
    outcome: 'Cited synthesis or refuse-and-gap when completeness is thin.',
    href: '/how-it-works',
    productLawNote: 'Never invent Discover ranks; investigation priority only.',
  },
  {
    id: 'ui_methodology',
    name: 'Methodology & honesty',
    channel: 'ui',
    audience: 'human',
    goal: 'ops',
    summary: 'Public of-record presentation rules, kit-diff, source honesty.',
    whenToUse: 'Cite how BioIntel presents data in a paper, grant, or review.',
    howHuman: 'Open /methodology; anchors #honesty #kit-diff #changelog.',
    outcome: 'Citable honesty rules; empty ≠ no association.',
    href: '/methodology',
  },
  {
    id: 'cli_health_gate',
    name: 'Health + quality gate',
    channel: 'cli',
    audience: 'agent',
    goal: 'ops',
    summary: 'App reachability and repo test:gate for safe automation.',
    whenToUse: 'Before agent batch work or after product code changes.',
    howAgent: 'npm run biointel -- health; npm run biointel -- gate',
    outcome: 'Green gate + reachable base URL before research automation.',
    cli: 'health | gate | e2e auto',
  },
  {
    id: 'cli_logs',
    name: 'Agent activity logs',
    channel: 'cli',
    audience: 'agent',
    goal: 'ops',
    summary: 'Local JSONL of product events, fetch outcomes, cache hits.',
    whenToUse: 'Debug M1 loop, rank ms, densify, or tool failures.',
    howAgent: 'npm run biointel -- logs tail --n 40; logs grep product.discover',
    outcome: 'Observable funnel without cloud telemetry requirement.',
    cli: 'logs tail [--n 40] | logs grep <pattern>',
  },
  {
    id: 'cli_api_raw',
    name: 'Raw free-API proxy',
    channel: 'api',
    audience: 'agent',
    goal: 'evidence',
    summary: 'GET/POST any app API path for scripted evidence pulls.',
    whenToUse: 'Custom agent scripts need a specific panel or route not wrapped in CLI.',
    howAgent: 'npm run biointel -- api get /api/molecule/2244',
    outcome: 'JSON from free public backends via app routes.',
    cli: 'api get <path> | api post <path> --body \'{}\'',
  },
  {
    id: 'cli_tools_catalog',
    name: 'Tools catalog (this surface)',
    channel: 'cli',
    audience: 'both',
    goal: 'ops',
    summary: 'List research tools and playbooks for humans and agents.',
    whenToUse: 'Onboarding or choosing the next research action.',
    howHuman: 'Open /how-it-works → Tools tab.',
    howAgent: 'npm run biointel -- tools list; tools playbook <id>',
    outcome: 'Shared map of what to use when — less tool thrash, faster loops.',
    href: '/how-it-works#tools',
    cli: 'tools list | tools playbook <id>',
  },
]

export const RESEARCH_TOOLS: ResearchToolEntry[] = [
  ...SURFACE_RESEARCH_TOOLS,
  ...COPILOT_RESEARCH_TOOLS,
]

/** Scientific + engineering playbooks (not PR implementation checklists). */
export const RESEARCH_PLAYBOOKS: ResearchPlaybook[] = [
  {
    id: 'disease_to_shortlist',
    title: 'Disease → deterministic shortlist',
    audience: 'both',
    goal: 'Produce an of-record ranked shortlist for a disease/indication with free-API provenance.',
    steps: [
      {
        title: 'Resolve disease & pin targets',
        human: 'On Discover, enter disease; confirm multi-hit; pin 1–3 targets if known.',
        agent: 'discover rank --q "…" --targets GENE1,GENE2',
        tools: ['ui_discover_rank', 'ui_orphanet_pins'],
      },
      {
        title: 'Rank (deterministic)',
        human: 'Run Rank; read score math tooltips and Why ranked chips — not AI.',
        agent: 'Inspect candidates table; timingMs.total for M7; never re-rank with LLM.',
        tools: ['ui_discover_rank'],
      },
      {
        title: 'Densify top-K',
        human: 'Enable safety/novelty densify; promote candidates that survive soft-flags.',
        agent: 'discover densify --q "…"; optional harvest --names "A,B"',
        tools: ['ui_discover_densify'],
      },
      {
        title: 'Save to project',
        human: 'Save ≥1 candidate to a local project for pack loop.',
        agent: 'UI project store (browser); verify product events in logs.',
        tools: ['ui_board_pack', 'cli_logs'],
      },
    ],
    successSignals: [
      'Scored candidates with source chips',
      'densify/harvest provenance on top-K when enabled',
      'discover_rank_completed.ms present in logs',
    ],
    lawReminders: [
      'No LLM in Discover rank path',
      'Free public APIs only',
      'Empty harvest ≠ no safety signal forever — retry with patience',
    ],
  },
  {
    id: 'cid_evidence_deep_dive',
    title: 'CID evidence deep-dive',
    audience: 'both',
    goal: 'Build an of-record evidence picture for one molecule before synthesis or wet-lab planning.',
    steps: [
      {
        title: 'Open profile / fetch categories',
        human: 'Molecule profile; wait Core categories; use Monitor for gaps.',
        agent: 'molecule get <cid>; molecule category <cid> pharmaceutical|clinical-safety|…',
        tools: ['ui_molecule_profile', 'copilot_get_retrieval_snapshot', 'copilot_list_loaded_categories'],
      },
      {
        title: 'Close gaps',
        human: 'Retry failed categories; load idle Core; open sparse panels.',
        agent: 'Ask copilot to fix_gap / load_category; or re-fetch category with refresh=1',
        tools: ['copilot_fix_gap', 'copilot_retry_category', 'copilot_load_category', 'copilot_open_panel'],
      },
      {
        title: 'Ledger + kit',
        human: 'Data hub Fact|Value|Source|Open; download Research kit.',
        agent: 'research kit --cid <n> --out kit.json',
        tools: ['ui_molecule_profile', 'cli_research_kit'],
      },
      {
        title: 'Optional AI (non-of-record)',
        human: 'Copilot Ask with citations; refuse if thin completeness.',
        agent: 'Agent loop tools then answer; never invent trials/AEs.',
        tools: ['ui_ai_copilot', 'copilot_get_panel_summary', 'copilot_suggest_next_actions'],
      },
    ],
    successSignals: [
      'Core categories loaded or explicitly empty/timeout',
      'Research kit factCount > 0 with content hashes',
      'AI answers cite [panel] keys or refuse with gaps',
    ],
    lawReminders: [
      'Empty/timeout = not retrieved, not “no association”',
      'AI investigation priority only — no regulatory decision language',
      'User verifies before wet-lab / grant claims',
    ],
  },
  {
    id: 'board_pack_to_rh',
    title: 'Board pack → research hypothesis',
    audience: 'both',
    goal: 'Promote shortlist candidates into a claim-bound pack and draft RH for investigation.',
    steps: [
      {
        title: 'Promote & harvest',
        human: 'Board → Promote candidates; wait safety harvest.',
        agent: 'boardHarvest pipeline via app; logs grep product.',
        tools: ['ui_board_pack', 'ui_discover_densify', 'cli_logs'],
      },
      {
        title: 'Build pack',
        human: 'Build pack → download; note claim/citable counts and warnings.',
        agent: 'packExtractPipeline; assert subjectCandidateId; max 5 extractors.',
        tools: ['ui_board_pack', 'copilot_get_pack_claims'],
      },
      {
        title: 'Pack AI (optional)',
        human: 'Run gap analysis / executive brief / next experiment on pack.',
        agent: 'POST /api/ai/pack; validate allowlisted claimIds only.',
        tools: ['ui_pack_ai'],
      },
      {
        title: 'Seed RH',
        human: 'Open Research Hypothesis; edit claim-bound statements.',
        agent: 'seed_research_hypothesis tool or RH helpers — do not auto-apply board decisions.',
        tools: ['ui_research_hypothesis', 'copilot_seed_research_hypothesis'],
      },
    ],
    successSignals: [
      'citable claims meet happy-path density or explicit warning',
      'RH statements rehydrate to real claim text',
      'Pack AI refuses free invention under min claims',
    ],
    lawReminders: [
      'Preserve subjectCandidateId on multi-CID packs',
      '5 extractor panels max',
      'AI non-of-record; user decides promote/demote',
    ],
  },
  {
    id: 'compare_and_choose',
    title: 'Compare candidates & choose',
    audience: 'both',
    goal: 'Decide investigation priority among 2–N candidates with of-record facts.',
    steps: [
      {
        title: 'Session set',
        human: 'Open 2+ molecule profiles so session history holds them.',
        agent: 'list_session_molecules; compare_board for project set',
        tools: ['copilot_list_session_molecules', 'copilot_compare_board', 'ui_compare_hub'],
      },
      {
        title: 'Side-by-side hub',
        human: 'Compare hub / dual strip; export if sharing offline.',
        agent: 'research kit per CID; diff kits on methodology page',
        tools: ['ui_compare_hub', 'cli_research_kit', 'ui_methodology'],
      },
      {
        title: 'Decision capture',
        human: 'Promote winner; watch/archive others; optional RH note.',
        agent: 'Project store status updates only — no silent auto-promote from AI.',
        tools: ['ui_board_pack', 'ui_research_hypothesis'],
      },
    ],
    successSignals: [
      'Of-record facts aligned across candidates',
      'Board statuses reflect human decision',
      'No of-record score rewritten by AI reorder views',
    ],
    lawReminders: [
      'Optional AI analysis views must be labeled non-of-record',
      'Solo export default for handoff',
    ],
  },
  {
    id: 'agent_ops_loop',
    title: 'Agent ops: health → research → gate',
    audience: 'agent',
    goal: 'Run a safe automation loop without violating product law.',
    steps: [
      {
        title: 'Health',
        agent: 'biointel health; confirm BIOINTEL_BASE',
        tools: ['cli_health_gate'],
      },
      {
        title: 'Research action',
        agent: 'tools playbook disease_to_shortlist or cid_evidence_deep_dive',
        tools: ['cli_tools_catalog', 'ui_discover_rank', 'cli_research_kit'],
      },
      {
        title: 'Observe',
        agent: 'logs tail / logs grep product.discover',
        tools: ['cli_logs'],
      },
      {
        title: 'Gate before merge',
        agent: 'biointel gate; e2e auto if north-star touched',
        tools: ['cli_health_gate'],
      },
    ],
    successSignals: [
      'App reachable',
      'Research JSON or shortlist produced',
      'test:gate green',
    ],
    lawReminders: [
      'Do not add paid APIs or LLM ranking “for convenience”',
      'Do not write exploits or attack scripts',
      'Prefer main; no dual-emit product event aliases',
    ],
  },
]

export function researchToolsByGoal(goal: ResearchGoal): ResearchToolEntry[] {
  return RESEARCH_TOOLS.filter((t) => t.goal === goal)
}

export function researchToolsByChannel(channel: ToolChannel): ResearchToolEntry[] {
  return RESEARCH_TOOLS.filter((t) => t.channel === channel)
}

export function researchPlaybookById(id: string): ResearchPlaybook | undefined {
  return RESEARCH_PLAYBOOKS.find((p) => p.id === id)
}

export function copilotToolNames(): CopilotToolName[] {
  return COPILOT_TOOLS.map((t) => t.name)
}

/** Compact lines for CLI / system prompts. */
export function formatPlaybookPlain(pb: ResearchPlaybook): string {
  const lines = [
    `# ${pb.title}`,
    `Goal: ${pb.goal}`,
    `Audience: ${pb.audience}`,
    '',
    'Steps:',
    ...pb.steps.map((s, i) => {
      const bits = [`${i + 1}. ${s.title}`]
      if (s.human) bits.push(`   Human: ${s.human}`)
      if (s.agent) bits.push(`   Agent: ${s.agent}`)
      if (s.tools.length) bits.push(`   Tools: ${s.tools.join(', ')}`)
      return bits.join('\n')
    }),
    '',
    'Success:',
    ...pb.successSignals.map((s) => `  • ${s}`),
    '',
    'Law:',
    ...pb.lawReminders.map((s) => `  • ${s}`),
  ]
  return lines.join('\n')
}
