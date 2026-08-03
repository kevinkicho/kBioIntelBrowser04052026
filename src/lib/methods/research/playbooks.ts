/** Scientific research playbooks. */
import { COPILOT_TOOLS, type CopilotToolName } from '@/lib/ai/copilot/tools/catalog'
import type { ResearchPlaybook, ResearchToolEntry, ToolChannel, ResearchGoal } from './types'
import { RESEARCH_TOOLS } from './tools'

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
  {
    id: 'safety_triangulation_pack',
    title: 'Safety triangulation → pack honesty',
    audience: 'both',
    goal: 'Assemble of-record multi-source safety samples (FAERS, recalls, labels, hazards) without incidence claims.',
    steps: [
      {
        title: 'Load clinical-safety',
        human: 'Molecule profile → Clinical & safety category; wait for FAERS/recalls/labels.',
        agent: 'molecule category <cid> clinical-safety; research kit --cid N',
        tools: ['ui_molecule_profile', 'cli_research_kit'],
      },
      {
        title: 'Read triangulation hub section',
        human: 'Data hub → Safety triangulation (session coverage score).',
        agent: 'Inspect hub section safety-triangulation; never rewrite as risk score.',
        tools: ['ui_molecule_profile'],
      },
      {
        title: 'Pack with warnings',
        human: 'Board pack including safety extractors; note empty/timeout rows.',
        agent: 'pack extractors only; preserve subjectCandidateId',
        tools: ['ui_board_pack'],
      },
    ],
    successSignals: [
      'Safety triangulation section present when bags loaded',
      'FAERS labeled as spontaneous reports not incidence',
      'Research kit v3-quality.json includes safetyTriangulation',
    ],
    lawReminders: [
      'Not clinical decision support',
      'Empty FAERS ≠ safe forever',
    ],
  },
  {
    id: 'five_regulator_card',
    title: 'Five-regulator coverage card',
    audience: 'both',
    goal: 'Of-record US/EU/CA + portal UK/AU/JP coverage for one molecule without authorization advice.',
    steps: [
      {
        title: 'Load pharmaceutical + international',
        human: 'Open pharmaceutical category; international-regulators panel for portals.',
        agent: 'molecule category <cid> pharmaceutical; inspect hub five-regulators section',
        tools: ['ui_molecule_profile', 'cli_research_kit'],
      },
      {
        title: 'Export kit',
        human: 'Research kit; check fiveRegulatorRegions in manifest / v3-quality.json',
        agent: 'research kit --cid N; jq .manifest research kit',
        tools: ['cli_research_kit'],
      },
    ],
    successSignals: [
      'Five-regulator hub section with US/EU/CA/portal rows',
      'Honesty notes present',
    ],
    lawReminders: [
      'Not multi-region marketing authorization advice',
      'Portal-only regions are Tier C deep links',
    ],
  },
  {
    id: 'rare_disease_depth',
    title: 'Rare-disease depth (Orphanet → shortlist)',
    audience: 'both',
    goal: 'Orpha/phenotype path with honest sparse evidence and gene pins.',
    steps: [
      {
        title: 'Persona + Orphanet',
        human: 'Discover rare persona / Orphanet boost; enter rare disease.',
        agent: 'discover rank --q "…" ; orphanet genes if orphaCode known',
        tools: ['ui_discover_rank', 'ui_orphanet_pins'],
      },
      {
        title: 'Pins + rank',
        human: 'Confirm gene pins; rank; read empty-panel honesty.',
        agent: 'Never invent gene–disease associations',
        tools: ['ui_discover_rank'],
      },
      {
        title: 'Negative evidence in kit',
        human: 'Molecule hub negative-evidence section; export kit',
        agent: 'research kit; assert neg-* rows when bags empty',
        tools: ['cli_research_kit', 'ui_molecule_profile'],
      },
    ],
    successSignals: [
      'Orphanet pins or explicit empty',
      'Negative evidence rows when free-API bags empty',
    ],
    lawReminders: [
      'Sparse public data is expected for many rare diseases',
      'No LLM inventing associations',
    ],
  },
  {
    id: 'org_to_sites',
    title: 'Org / lab → site context',
    audience: 'both',
    goal: 'Build of-record research-lab dossier (ROR/CMS/Scorecard) for affiliation context.',
    steps: [
      {
        title: 'Search org',
        human: 'Open /orgs; search university or hospital name.',
        agent: 'biointel api get /api/research-labs?q=… or /api/ror?q=…',
        tools: ['ui_methodology'],
      },
      {
        title: 'Dossier',
        human: 'Open research-lab dossier tab; export if needed.',
        agent: 'GET /api/research-labs?q=…; freeApiAgent etiquette applies',
        tools: ['cli_research_kit'],
      },
      {
        title: 'Join molecule',
        human: 'From trials/grants on a molecule, open affiliated org.',
        agent: 'Do not invent hospital quality rankings',
        tools: ['ui_molecule_profile'],
      },
    ],
    successSignals: [
      'ROR or CMS rows present or honest empty',
      'No “best hospital” language',
    ],
    lawReminders: [
      'Not clinical referral advice',
      'Free public affiliation data only',
    ],
  },
  {
    id: 'campaign_workspace_loop',
    title: 'Full campaign workspace loop',
    audience: 'both',
    goal: 'Run a multi-stage campaign (repurposing or rare) to Monday work.',
    steps: [
      {
        title: 'Pick persona template',
        human: 'How-it-works tools / playbooks → campaign template.',
        agent: 'Use CAMPAIGN_TEMPLATES in campaignWorkspace.ts',
        tools: ['cli_tools_catalog'],
      },
      {
        title: 'Execute stages',
        human: 'Disease → rank → promote → pack → RH.',
        agent: 'Chain disease_to_shortlist then board_pack_to_rh',
        tools: ['ui_discover_rank', 'ui_board_pack', 'ui_research_hypothesis'],
      },
      {
        title: 'Export kit + quality',
        human: 'Research kit v3-quality.json; citation score for pack.',
        agent: 'research kit --cid N; check schemaVersion 2',
        tools: ['cli_research_kit'],
      },
    ],
    successSignals: [
      'Pack with citable claims or explicit warning',
      'RH claim-bound',
      'Kit content hash present',
    ],
    lawReminders: [
      'Of-record rank never rewritten by AI views',
      'Solo export default',
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
