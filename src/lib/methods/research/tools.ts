/** Research tool entries (UI / CLI / copilot allowlist mapping). */
import {
  COPILOT_MAX_TOOL_STEPS,
  COPILOT_TOOLS,
  type CopilotToolName,
} from '@/lib/ai/copilot/tools/catalog'
import type { ResearchGoal, ResearchToolEntry } from './types'

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
