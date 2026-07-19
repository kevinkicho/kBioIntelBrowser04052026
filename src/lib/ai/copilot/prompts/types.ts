export interface SessionMoleculeSummary {
  name: string
  searchedAt: string
  topTargets: string[]
  topAEs: string[]
  mechanisms: string[]
  indications: string[]
}

export type PromptMode =
  | 'auto_insight'
  | 'executive_brief'
  | 'gap_analysis'
  | 'safety_deep_dive'
  | 'mechanism_analysis'
  | 'therapeutic_hypothesis'
  | 'competitive_position'
  | 'repurposing_scan'
  | 'cross_molecule_compare'
  | 'free_qa'
  | 'followup'
  | 'gene_therapeutic'
  | 'gene_repurposing'
  | 'gene_mechanism'
  | 'gene_target_assessment'
  | 'prior_art_query'
  | 'differential_safety'
  | 'suggest_next'
  | 'hypothesis_seed'
