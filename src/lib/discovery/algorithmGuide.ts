/**
 * Discover algorithm guide — educational copy only.
 * Ranking remains deterministic multi-axis scoring over free public APIs.
 * LLMs are never used to invent ranks or scores (product law).
 *
 * @see docs/design/discovery-workbench-v1.md §5.1.2
 * @see docs/design/discovery-workbench-v2.1.md constraint law
 */

export interface DiscoverPipelineStage {
  id: string
  title: string
  short: string
  detail: string
  sources: string[]
  /** Approximate share of wall time for education (not a live estimate) */
  effort: 'fast' | 'moderate' | 'heavier'
}

/** Stages aligned with rank engine + optional harvest. */
export const DISCOVER_PIPELINE_STAGES: DiscoverPipelineStage[] = [
  {
    id: 'disease',
    title: 'Confirm disease',
    short: 'Resolve your query to a registry disease (Open Targets / Orphanet).',
    detail:
      'Ambiguous names show a picker — we never silently pick diseaseResults[0]. A hard diseaseId pin skips multi-hit confirmation.',
    sources: ['Open Targets', 'Orphanet'],
    effort: 'fast',
  },
  {
    id: 'targets',
    title: 'Identify targets',
    short: 'Disease–gene associations plus any symbols you pin.',
    detail:
      'Pinned targets bias gathering and the gene-association axis. Pins are not invented genes — they are your mechanistic hypotheses (or Orphanet merges when rare-disease boost is on).',
    sources: ['Open Targets', 'DisGeNET-style associations', 'User pins'],
    effort: 'fast',
  },
  {
    id: 'gather',
    title: 'Gather candidates',
    short: 'Known drugs, trial drugs, ChEMBL indications, target-linked molecules.',
    detail:
      'Free public endpoints only. Names are de-duplicated into a shortlist (cap ~50) before expensive identity work.',
    sources: ['ChEMBL', 'ClinicalTrials.gov', 'Open Targets known drugs', 'Target→molecule maps'],
    effort: 'moderate',
  },
  {
    id: 'identity',
    title: 'Resolve identity (top 25)',
    short: 'PubChem CID → InChIKey / SMILES for trust scoring.',
    detail:
      'Only the top-N candidates hit PubChem property batches (concurrency-limited). Identity trust becomes a scored axis — unresolved names rank lower, not invented.',
    sources: ['PubChem PUG'],
    effort: 'moderate',
  },
  {
    id: 'score',
    title: 'Multi-axis cheap score',
    short: 'Weighted composite from transparent axes (your rubric).',
    detail:
      'Axes: efficacy signal, clinical stage, safety (when harvested), novelty, identity trust. Weights come from presets or your sliders — never from an LLM.',
    sources: ['Deterministic score engine'],
    effort: 'fast',
  },
  {
    id: 'harvest',
    title: 'Safety & novelty harvest (optional)',
    short: 'Top-K openFDA AE/recalls + EuropePMC novelty when enabled.',
    detail:
      'Default harvestTiming is board/promote-time (faster first paint). Rank-time harvest re-scores top-15 with full safety/novelty axes.',
    sources: ['openFDA', 'EuropePMC'],
    effort: 'heavier',
  },
]

export interface ScoreAxisGuide {
  key: string
  label: string
  summary: string
  expect: string
}

export const SCORE_AXIS_GUIDE: ScoreAxisGuide[] = [
  {
    key: 'efficacy',
    label: 'Efficacy',
    summary: 'How strongly public evidence ties the molecule to disease/target activity.',
    expect: 'Higher for known drugs / strong target chemistry; lower for weak or name-only hits.',
  },
  {
    key: 'clinicalStage',
    label: 'Clinical stage',
    summary: 'Approved / clinical development signal from public trial & label-linked sources.',
    expect: 'Repurposing presets boost this; novel-bioactive presets de-emphasize it.',
  },
  {
    key: 'safety',
    label: 'Safety',
    summary: 'Adverse-event and recall burden when harvested (openFDA).',
    expect: 'May stay provisional until harvest. Soft-flag vs hard-penalty is a preference.',
  },
  {
    key: 'novelty',
    label: 'Novelty',
    summary: 'Literature / reporting density (EuropePMC-style novelty harvest).',
    expect: 'Higher novelty can mean less crowded chemistry — not “better drug.”',
  },
  {
    key: 'identityTrust',
    label: 'Identity trust',
    summary: 'How solid the structure ID is (InChIKey / CID / ChEMBL).',
    expect: 'Unresolved synonyms rank lower so you do not promote ghost names.',
  },
]

export const DISCOVER_EXPECTATIONS = {
  headline: 'Evidence-first candidate triage',
  subhead:
    'Disease → targets → ranked small molecules from free public databases. Transparent scores, no paid DBs.',
  bullets: [
    {
      title: 'What you get',
      text: 'A shortlist with multi-axis scores, source status, gene associations, and deep links into molecule profiles.',
    },
    {
      title: 'What ranking is',
      text: 'Deterministic algorithms over public APIs + your rubric weights. Reproducible for the same prefs and inputs.',
    },
    {
      title: 'What ranking is not',
      text: 'Not generative AI inventing ranks, not regulatory advice, and not a prediction that a drug “works.”',
    },
    {
      title: 'How long',
      text: 'Usually seconds to ~half a minute. Rank-time safety harvest and cold free-API latency can take longer — watch the live elapsed timer.',
    },
  ],
  lawNote:
    'AI (when used elsewhere in BioIntel) is claim-bound on evidence packs / research hypotheses only — never in the Discover rank path.',
} as const

/** Map progress labels to guide stage ids for tooltips during load. */
export function stageIdFromProgressLabel(label: string): string | null {
  const l = label.toLowerCase()
  if (l.includes('confirm') || l.includes('disease')) return 'disease'
  if (l.includes('target')) return 'targets'
  if (l.includes('gather') || l.includes('candidate')) return 'gather'
  if (l.includes('identity') || l.includes('resolv')) return 'identity'
  if (l.includes('harvest') || l.includes('safety') || l.includes('novelty')) return 'harvest'
  if (l.includes('score') || l.includes('rank') || l.includes('cheap') || l.includes('full')) {
    return 'score'
  }
  return null
}

export function effortLabel(effort: DiscoverPipelineStage['effort']): string {
  switch (effort) {
    case 'fast':
      return 'Usually quick'
    case 'moderate':
      return 'Network-bound'
    case 'heavier':
      return 'Can take longer'
  }
}
