/**
 * Campaign workspace model (v3 G1) — pure structure for multi-step scientific campaigns.
 * Solo + local default; does not replace Discover of-record rank.
 */

import type { ResearchGoal } from '@/lib/methods/research/types'

export type CampaignPersona = 'repurposing' | 'rare-disease' | 'competitive' | 'lab-affiliation'

export type CampaignStageId =
  | 'disease_confirm'
  | 'pin_targets'
  | 'rank_shortlist'
  | 'promote_harvest'
  | 'evidence_pack'
  | 'research_hypothesis'
  | 'monday_experiment'

export interface CampaignStage {
  id: CampaignStageId
  title: string
  href: string
  playbookId?: string
  doneHint: string
}

export interface CampaignWorkspaceTemplate {
  id: string
  persona: CampaignPersona
  title: string
  goal: ResearchGoal | 'ops'
  description: string
  stages: CampaignStage[]
  lawReminders: string[]
}

/** Default campaign templates — UI/CLI can render without network. */
export const CAMPAIGN_TEMPLATES: CampaignWorkspaceTemplate[] = [
  {
    id: 'campaign-repurposing',
    persona: 'repurposing',
    title: 'Repurposing triage campaign',
    goal: 'discover',
    description:
      'Disease → pin targets → deterministic shortlist → promote → pack → RH → Monday work.',
    stages: [
      {
        id: 'disease_confirm',
        title: 'Confirm disease',
        href: '/discover?q=ATTR%20amyloidosis',
        playbookId: 'disease_to_shortlist',
        doneHint: 'Disease query resolved with multi-hit confirm when needed',
      },
      {
        id: 'pin_targets',
        title: 'Pin targets',
        href: '/discover?q=ATTR%20amyloidosis&targets=TTR',
        playbookId: 'disease_to_shortlist',
        doneHint: '1–10 gene pins or Orphanet merge',
      },
      {
        id: 'rank_shortlist',
        title: 'Rank shortlist (of-record)',
        href: '/discover?q=ATTR%20amyloidosis&targets=TTR',
        playbookId: 'disease_to_shortlist',
        doneHint: 'Deterministic scores; no LLM rank',
      },
      {
        id: 'promote_harvest',
        title: 'Promote + safety harvest',
        href: '/projects',
        playbookId: 'board_pack_to_rh',
        doneHint: 'Promote status triggers harvest (watching does not)',
      },
      {
        id: 'evidence_pack',
        title: 'Claim-rich pack',
        href: '/projects',
        playbookId: 'board_pack_to_rh',
        doneHint: '≤5 extractors; citation completeness checked',
      },
      {
        id: 'research_hypothesis',
        title: 'Research hypothesis',
        href: '/projects',
        playbookId: 'board_pack_to_rh',
        doneHint: 'Claim-bound RH statements',
      },
      {
        id: 'monday_experiment',
        title: 'Monday experiment',
        href: '/molecule/208901?view=research',
        playbookId: 'safety_triangulation_pack',
        doneHint: 'NextExperiment or Monday pack export (library templates)',
      },
    ],
    lawReminders: [
      'Free public APIs only',
      'No LLM in Discover rank path',
      'Not regulatory decision support',
    ],
  },
  {
    id: 'campaign-rare',
    persona: 'rare-disease',
    title: 'Rare-disease lab campaign',
    goal: 'discover',
    description: 'Orpha → gene pins → sparse honest shortlist → pack with negative evidence.',
    stages: [
      {
        id: 'disease_confirm',
        title: 'Orpha / phenotype confirm',
        href: '/discover?q=cystic%20fibrosis&targets=CFTR',
        playbookId: 'rare_disease_depth',
        doneHint: 'Orphanet boost on; rare tour optional',
      },
      {
        id: 'pin_targets',
        title: 'Orphanet gene pins',
        href: '/discover?q=cystic%20fibrosis&targets=CFTR',
        playbookId: 'rare_disease_depth',
        doneHint: 'Gene pins from Orphadata',
      },
      {
        id: 'rank_shortlist',
        title: 'Rank with honest empties',
        href: '/discover?q=cystic%20fibrosis&targets=CFTR',
        playbookId: 'rare_disease_depth',
        doneHint: 'Empty ≠ no association forever',
      },
      {
        id: 'evidence_pack',
        title: 'Pack + negative evidence',
        href: '/projects',
        playbookId: 'board_pack_to_rh',
        doneHint: 'Hub negative-evidence section included',
      },
      {
        id: 'research_hypothesis',
        title: 'Sparse-evidence RH',
        href: '/projects',
        playbookId: 'board_pack_to_rh',
        doneHint: 'Claim-bound only; AI refuses if thin',
      },
      {
        id: 'monday_experiment',
        title: 'Validation / lit plan',
        href: '/how-it-works#tools',
        doneHint: 'Monday pack or protocol template',
      },
    ],
    lawReminders: [
      'Rare-disease persona does not invent associations',
      'Prefer Soft AE when sparse',
    ],
  },
  {
    id: 'campaign-competitive',
    persona: 'competitive',
    title: 'Competitive landscape campaign',
    goal: 'compare',
    description: 'Target competitive compounds → compare hub → promote winners.',
    stages: [
      {
        id: 'pin_targets',
        title: 'Choose target',
        href: '/discover?q=non-small%20cell%20lung%20cancer&targets=EGFR',
        playbookId: 'compare_and_choose',
        doneHint: 'ChEMBL target or gene symbol',
      },
      {
        id: 'rank_shortlist',
        title: 'Competitive + shortlist',
        href: '/compare',
        playbookId: 'compare_and_choose',
        doneHint: 'Compare hub side-by-side',
      },
      {
        id: 'evidence_pack',
        title: 'Pack winners',
        href: '/projects',
        playbookId: 'board_pack_to_rh',
        doneHint: 'Multi-CID pack ≤5',
      },
      {
        id: 'monday_experiment',
        title: 'Differentiation notes',
        href: '/how-it-works#tools',
        doneHint: 'Of-record facts only in pack',
      },
    ],
    lawReminders: ['No invented competitors', 'AI analysis views labeled non-of-record'],
  },
  {
    id: 'campaign-lab',
    persona: 'lab-affiliation',
    title: 'Lab / site context campaign',
    goal: 'evidence',
    description: 'Org dossier from ROR/CMS/Scorecard → join trials/grants on molecule.',
    stages: [
      {
        id: 'disease_confirm',
        title: 'Find org / lab',
        href: '/orgs',
        playbookId: 'org_to_sites',
        doneHint: 'Research lab dossier loaded',
      },
      {
        id: 'evidence_pack',
        title: 'Join molecule evidence',
        href: '/molecule/2244',
        playbookId: 'cid_evidence_deep_dive',
        doneHint: 'Trials/grants affiliation context',
      },
      {
        id: 'monday_experiment',
        title: 'Site shortlist for outreach',
        href: '/orgs',
        doneHint: 'Export org hub — not referral advice',
      },
    ],
    lawReminders: [
      'Not clinical referral or “best hospital” language',
      'Free public affiliation data only',
    ],
  },
]

export function campaignTemplateById(id: string): CampaignWorkspaceTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === id)
}

export function campaignTemplatesByPersona(
  persona: CampaignPersona,
): CampaignWorkspaceTemplate[] {
  return CAMPAIGN_TEMPLATES.filter((t) => t.persona === persona)
}
