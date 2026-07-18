/**
 * User-facing catalog of how BioIntel is wired: algorithms + AI prompts.
 * Pure data for /how-it-works — no network.
 *
 * Product law: free public APIs; deterministic Discover ranking (no LLM in rank path);
 * AI claim-bound on packs / research hypotheses / profile copilot (evidence-gated).
 */

import {
  DISCOVER_PIPELINE_STAGES,
  SCORE_AXIS_GUIDE,
  DISCOVER_EXPECTATIONS,
} from '@/lib/discovery/algorithmGuide'
import {
  AI_MIN_COMPLETENESS_RATIO,
  AI_MIN_PANELS_WITH_DATA,
} from '@/lib/ai/promptTemplates'
import { packModeSystemPrompt, packModeTaskLabel, type PackAiMode } from '@/lib/ai/contracts'

/** Shared copilot system rules (abbreviated for display; full text in source). */
export const COPILOT_SYSTEM_RULES_SUMMARY = [
  'Evidence-first: every scientific claim must cite a panel/source key (e.g. [chembl], [adverse-events]).',
  'No invention when data is sparse — refuse deep synthesis below completeness gates.',
  'Empty/timeout panels mean “not retrieved”, not “no association”.',
  'Prefer researcher synthesis over secretary data recitation when evidence is adequate.',
  'Investigation priority only — not regulatory decision support or clinical success prediction.',
]

export const COPILOT_COMPLETENESS_GATE = {
  minPanelsWithData: AI_MIN_PANELS_WITH_DATA,
  minCompletenessRatio: AI_MIN_COMPLETENESS_RATIO,
  description: `Deep synthesis is refused when fewer than ${AI_MIN_PANELS_WITH_DATA} panels have data or completeness is under ${Math.round(AI_MIN_COMPLETENESS_RATIO * 100)}%.`,
}

export type PromptSurface =
  | 'molecule_copilot'
  | 'gene_copilot'
  | 'disease_copilot'
  | 'pack_ai'
  | 'hypothesis'
  | 'discover_off_path'

export interface PromptCatalogEntry {
  id: string
  surface: PromptSurface
  label: string
  /** Where the user triggers it */
  where: string
  /** What the mode asks the model to do */
  purpose: string
  /** What data is injected into the user message */
  inputs: string[]
  /** Safety / product constraints */
  constraints: string[]
  /** Builder function name in source (for engineers) */
  sourceSymbol: string
  /** Whether this can affect Discover ranking (always false for product law) */
  affectsDiscoverRank: boolean
  /** Optional static system excerpt for transparency */
  systemExcerpt?: string
}

export const PROMPT_CATALOG: PromptCatalogEntry[] = [
  {
    id: 'auto_insight',
    surface: 'molecule_copilot',
    label: 'Auto insight',
    where: 'Molecule profile · AI Copilot',
    purpose: '3–4 cross-domain findings with panel citations when completeness is adequate.',
    inputs: ['Molecule context (identity, panels, counts)', 'Retrieval snapshot / gaps'],
    constraints: ['Completeness gate', 'Must cite [panel] keys', 'No free invention'],
    sourceSymbol: 'buildAutoInsightPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'executive_brief',
    surface: 'molecule_copilot',
    label: 'Executive brief',
    where: 'Molecule profile · AI Copilot',
    purpose: 'Classification, assets, risks, opportunity, data confidence — claim-cited.',
    inputs: ['Molecule context', 'Retrieval summary'],
    constraints: ['Completeness gate for deep claims', 'Investigation priority only'],
    sourceSymbol: 'buildExecutiveBriefPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'gap_analysis',
    surface: 'molecule_copilot',
    label: 'Gap analysis',
    where: 'Molecule profile · AI Copilot',
    purpose: 'Explain empty sources, scientific questions blocked, next fetches.',
    inputs: ['Gap list by panel', 'Bullet profile'],
    constraints: ['Does not invent missing data'],
    sourceSymbol: 'buildGapAnalysisPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'safety_deep_dive',
    surface: 'molecule_copilot',
    label: 'Safety deep-dive',
    where: 'Molecule profile · AI Copilot',
    purpose: 'Connect AE/recall/interaction signals to mechanism when both sides exist.',
    inputs: ['Top AEs', 'Recalls', 'Interactions', 'SIDER', 'Mechanisms'],
    constraints: ['Cite panels; no causal invention without data'],
    sourceSymbol: 'buildSafetyDeepDivePrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'mechanism_analysis',
    surface: 'molecule_copilot',
    label: 'Mechanism analysis',
    where: 'Molecule profile · AI Copilot',
    purpose: 'MoA / targets / pathways synthesis from loaded bioactivity panels.',
    inputs: ['ChEMBL mechanisms/activities', 'Pathways', 'Targets'],
    constraints: ['Evidence-bound'],
    sourceSymbol: 'buildMechanismAnalysisPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'therapeutic_hypothesis',
    surface: 'molecule_copilot',
    label: 'Therapeutic hypothesis',
    where: 'Molecule profile · AI Copilot',
    purpose: 'Evidence-backed hypothesis sketch for investigation (not efficacy claims).',
    inputs: ['Indications', 'Targets', 'Trials', 'Gaps'],
    constraints: ['No “this drug works” language'],
    sourceSymbol: 'buildTherapeuticHypothesisPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'competitive_position',
    surface: 'molecule_copilot',
    label: 'Competitive position',
    where: 'Molecule profile · AI Copilot',
    purpose: 'Landscape vs similar agents using loaded competitive / indication data.',
    inputs: ['Competitive landscape', 'Indications', 'Clinical stage'],
    constraints: ['Cite loaded sources only'],
    sourceSymbol: 'buildCompetitivePositionPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'repurposing_scan',
    surface: 'molecule_copilot',
    label: 'Repurposing scan',
    where: 'Molecule profile · AI Copilot',
    purpose: 'Possible reuse angles grounded in MoA + disease links already loaded.',
    inputs: ['Mechanisms', 'Targets', 'Disease associations', 'Trials'],
    constraints: ['Hypothesis only; cite panels'],
    sourceSymbol: 'buildRepurposingScanPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'cross_molecule_compare',
    surface: 'molecule_copilot',
    label: 'Cross-molecule compare',
    where: 'Molecule profile · AI Copilot (session history)',
    purpose: 'Compare current molecule to prior session molecules.',
    inputs: ['Current context', 'Session molecule summaries'],
    constraints: ['Only uses provided summaries'],
    sourceSymbol: 'buildCrossMoleculeComparePrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'free_qa',
    surface: 'molecule_copilot',
    label: 'Free Q&A / follow-up',
    where: 'Molecule profile · AI Copilot chat',
    purpose: 'Answer user questions with molecule data block + conversation history.',
    inputs: ['User question', 'Molecule context block', 'History'],
    constraints: ['System rules + completeness awareness'],
    sourceSymbol: 'buildFreeQAPrompt / buildFollowUpPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'gene_therapeutic',
    surface: 'gene_copilot',
    label: 'Gene · therapeutic',
    where: 'Gene page · AI Copilot',
    purpose: 'Therapeutic context for a gene target from loaded gene panels.',
    inputs: ['Gene context (drugs, diseases, variants, expression, pathways)'],
    constraints: ['Evidence-bound; free public gene sources'],
    sourceSymbol: 'buildGeneTherapeuticPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'gene_repurposing',
    surface: 'gene_copilot',
    label: 'Gene · repurposing',
    where: 'Gene page · AI Copilot',
    purpose: 'Repurposing angles via gene–drug and disease associations.',
    inputs: ['Gene context'],
    constraints: ['No rank rewrite of Discover'],
    sourceSymbol: 'buildGeneRepurposingPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'gene_mechanism',
    surface: 'gene_copilot',
    label: 'Gene · mechanism',
    where: 'Gene page · AI Copilot',
    purpose: 'Pathway / expression / dosage mechanism narrative.',
    inputs: ['Gene pathways, expression, ClinGen dosage'],
    constraints: ['Cite gene panels'],
    sourceSymbol: 'buildGeneMechanismPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'gene_target_assessment',
    surface: 'gene_copilot',
    label: 'Gene · target assessment',
    where: 'Gene page · AI Copilot',
    purpose: 'Target tractability-style assessment from loaded public gene evidence.',
    inputs: ['Gene context'],
    constraints: ['Investigation only'],
    sourceSymbol: 'buildGeneTargetAssessmentPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'prior_art_query',
    surface: 'molecule_copilot',
    label: 'Prior art query',
    where: 'Molecule profile · AI task',
    purpose: 'Structure a prior-art / literature search framing from loaded data.',
    inputs: ['Molecule context'],
    constraints: ['Does not search paid patent DBs'],
    sourceSymbol: 'buildPriorArtQueryPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'differential_safety',
    surface: 'molecule_copilot',
    label: 'Differential safety',
    where: 'Molecule profile · AI task',
    purpose: 'Compare safety profiles vs another session molecule summary.',
    inputs: ['Current molecule', 'Other session summary'],
    constraints: ['Only provided AE/safety fields'],
    sourceSymbol: 'buildDifferentialSafetyPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'suggest_next',
    surface: 'molecule_copilot',
    label: 'Suggest next',
    where: 'Molecule profile · AI task',
    purpose: 'Concrete next data fetches / experiments given gaps.',
    inputs: ['Context + completeness'],
    constraints: ['Actionable free-API next steps'],
    sourceSymbol: 'buildSuggestNextPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'hypothesis_seed',
    surface: 'hypothesis',
    label: 'Hypothesis seed',
    where: 'Hypothesis builder',
    purpose: 'JSON filter seeds for the hypothesis builder (gene/indication/phase/ATC).',
    inputs: ['Molecule context', 'Research question'],
    constraints: ['Validated JSON; axes mapped to builder filters'],
    sourceSymbol: 'buildHypothesisSeedPrompt',
    affectsDiscoverRank: false,
  },
  {
    id: 'pack_executive_brief',
    surface: 'pack_ai',
    label: 'Pack · executive brief',
    where: 'Evidence pack AI',
    purpose: packModeTaskLabel('pack_executive_brief'),
    inputs: ['Pack claims allowlist', 'Candidate names', 'Disease'],
    constraints: ['JSON with claimIds only from allowlist', 'No invented confidence'],
    sourceSymbol: 'packModeSystemPrompt(pack_executive_brief)',
    affectsDiscoverRank: false,
    systemExcerpt: packModeSystemPrompt('pack_executive_brief'),
  },
  {
    id: 'pack_gap_analysis',
    surface: 'pack_ai',
    label: 'Pack · gap analysis',
    where: 'Evidence pack AI',
    purpose: packModeTaskLabel('pack_gap_analysis'),
    inputs: ['Pack claims allowlist'],
    constraints: ['Claim-bound JSON'],
    sourceSymbol: 'packModeSystemPrompt(pack_gap_analysis)',
    affectsDiscoverRank: false,
    systemExcerpt: packModeSystemPrompt('pack_gap_analysis'),
  },
  {
    id: 'pack_next_experiment',
    surface: 'pack_ai',
    label: 'Pack · next experiment',
    where: 'Evidence pack AI',
    purpose: packModeTaskLabel('pack_next_experiment'),
    inputs: ['Pack claims allowlist'],
    constraints: ['Claim-bound JSON'],
    sourceSymbol: 'packModeSystemPrompt(pack_next_experiment)',
    affectsDiscoverRank: false,
    systemExcerpt: packModeSystemPrompt('pack_next_experiment'),
  },
  {
    id: 'pack_red_team',
    surface: 'pack_ai',
    label: 'Pack · red team',
    where: 'Evidence pack AI',
    purpose: packModeTaskLabel('pack_red_team'),
    inputs: ['Pack claims (prefer safety/trial)'],
    constraints: ['Claim-bound JSON'],
    sourceSymbol: 'packModeSystemPrompt(pack_red_team)',
    affectsDiscoverRank: false,
    systemExcerpt: packModeSystemPrompt('pack_red_team'),
  },
  {
    id: 'pack_custom_prompt',
    surface: 'pack_ai',
    label: 'Pack · custom question',
    where: 'Evidence pack AI',
    purpose: packModeTaskLabel('pack_custom_prompt'),
    inputs: ['Pack claims', 'User question'],
    constraints: ['Prose answer; only allowlisted claim ids'],
    sourceSymbol: 'packModeSystemPrompt(pack_custom_prompt)',
    affectsDiscoverRank: false,
    systemExcerpt: packModeSystemPrompt('pack_custom_prompt'),
  },
  {
    id: 'discover_rationale_legacy',
    surface: 'discover_off_path',
    label: 'Discover rationale (not used for ranking)',
    where: 'Legacy helper in source — not wired into Discover rank API',
    purpose:
      'Would narrate why a candidate scored well. Product law forbids free-form Discover ranking AI; ranking stays deterministic.',
    inputs: ['Pre-computed scores only (if ever called)'],
    constraints: ['Does not change composite scores', 'Not in rank path'],
    sourceSymbol: 'buildDiscoverRationalePrompt',
    affectsDiscoverRank: false,
  },
]

export const PACK_AI_MODES: PackAiMode[] = [
  'pack_executive_brief',
  'pack_gap_analysis',
  'pack_next_experiment',
  'pack_red_team',
  'pack_custom_prompt',
]

export interface AlgorithmCatalogEntry {
  id: string
  area: 'discover' | 'profile' | 'identity' | 'cache' | 'safety'
  title: string
  summary: string
  steps: string[]
  codeAreas: string[]
  usesLlm: boolean
}

export const ALGORITHM_CATALOG: AlgorithmCatalogEntry[] = [
  {
    id: 'discover_rank',
    area: 'discover',
    title: 'Discover multi-axis rank engine',
    summary: DISCOVER_EXPECTATIONS.subhead,
    steps: DISCOVER_PIPELINE_STAGES.map(
      (s) => `${s.title}: ${s.short} (${s.sources.join(', ')})`,
    ),
    codeAreas: [
      'src/lib/discovery/engine.ts',
      'src/lib/discovery/identityResolve.ts',
      'src/lib/discovery/harvest.ts',
      'src/lib/domain/score.ts',
      'src/app/api/discover/rank/route.ts',
    ],
    usesLlm: false,
  },
  {
    id: 'score_axes',
    area: 'discover',
    title: 'Score axes & rubric presets',
    summary:
      'Composite = weighted sum over available axes. Missing axes use renormalize or penalize policy — never LLM-filled.',
    steps: SCORE_AXIS_GUIDE.map((a) => `${a.label}: ${a.summary}`),
    codeAreas: [
      'src/lib/domain/score.ts',
      'src/lib/discovery/scoreAxes.ts',
      'src/lib/discovery/preferences.ts',
    ],
    usesLlm: false,
  },
  {
    id: 'identity_batch',
    area: 'identity',
    title: 'Batch identity resolve (top-N)',
    summary:
      'PubChem multi-CID property fetch with concurrency pool; InChIKey drives identityTrust axis.',
    steps: [
      'Take top-N candidates lacking valid InChIKey',
      'Batch property requests (CID list) with mapPool concurrency',
      'Fall back to per-CID on batch failure',
      'assessIdentityTrust → axis + candidateId (ik: preferred)',
    ],
    codeAreas: ['src/lib/discovery/identityResolve.ts', 'src/lib/domain/identity.ts'],
    usesLlm: false,
  },
  {
    id: 'harvest_safety_novelty',
    area: 'safety',
    title: 'Safety & novelty harvest',
    summary:
      'Optional openFDA AE/recalls + EuropePMC novelty for top-K; board-promote default vs rank-time.',
    steps: [
      'Select top-K candidates needing harvest',
      'Soft-timeout parallel safety + novelty fetches',
      'Merge into ScoreVector axes',
      'Re-rank when harvestTiming = rank-time or user loads safety',
    ],
    codeAreas: ['src/lib/discovery/harvest.ts', 'src/app/api/discover/harvest/route.ts'],
    usesLlm: false,
  },
  {
    id: 'profile_categories',
    area: 'profile',
    title: 'Molecule profile category fan-out',
    summary:
      'Tiered category loads call free public APIs in parallel; client L1/L2 cache + soft refresh; AbortController cancel on remount.',
    steps: [
      'Hydrate IDB → memory cache',
      'Load active / decision tier first',
      'Stagger remaining categories',
      'Per-source soft timeout; empty/error honesty on panels',
    ],
    codeAreas: [
      'src/app/molecule/[id]/ProfilePageClient.tsx',
      'src/lib/categoryFetchers/*',
      'src/lib/fetchCategory.ts',
      'src/lib/clientFetch.ts',
    ],
    usesLlm: false,
  },
  {
    id: 'pack_extract',
    area: 'profile',
    title: 'Board pack claim extraction',
    summary:
      'Select promote/watching/other candidates; fetch Core panels; extract citable claims (max extractor panels).',
    steps: [
      'selectPackCandidates multi-partition fill',
      'fetchCorePanelsForCid (concurrency + timeout)',
      'extract claims with subjectCandidateId preserved',
    ],
    codeAreas: ['src/lib/project/packClaims.ts', 'src/lib/evidence/extractAll.ts'],
    usesLlm: false,
  },
  {
    id: 'pack_ai_validate',
    area: 'profile',
    title: 'Pack AI claim validation',
    summary:
      'Model output is validated so claimIds must come from the pack allowlist — refuse free invention.',
    steps: [
      'Build pack context + allowlist',
      'Run structured or custom mode prompt',
      'validatePackAiOutput strips unknown claim ids / fails closed',
    ],
    codeAreas: ['src/lib/ai/contracts.ts', 'src/lib/ai/validateOutput.ts', 'src/app/api/ai/pack/route.ts'],
    usesLlm: true,
  },
]

export const PRODUCT_LAW_BULLETS = [
  'Free public APIs only (no paid DBs as product requirements).',
  'Evidence-first; no regulatory decision support language.',
  'Discover ranking is deterministic — never LLM in the rank path.',
  'AI is claim-bound on packs / research hypotheses and evidence-gated on profile copilot.',
  'Solo + local export default; share optional.',
] as const

export function promptsBySurface(surface: PromptSurface): PromptCatalogEntry[] {
  return PROMPT_CATALOG.filter((p) => p.surface === surface)
}

export function algorithmsByArea(
  area: AlgorithmCatalogEntry['area'],
): AlgorithmCatalogEntry[] {
  return ALGORITHM_CATALOG.filter((a) => a.area === area)
}
