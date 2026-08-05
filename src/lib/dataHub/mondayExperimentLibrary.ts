/**
 * Monday experiment library (v3 A6) — pure templates for lab handoff.
 * Of-record framing only; not clinical protocols or wet-lab guarantees.
 */

export type MondayExperimentKind =
  | 'lit_confirm'
  | 'safety_triangulate'
  | 'target_orthogonal'
  | 'structure_check'
  | 'competitive_scan'
  | 'rare_gene_pin'
  | 'kit_export'

export interface MondayExperimentTemplate {
  id: string
  kind: MondayExperimentKind
  title: string
  /** One-line agenda for Monday pack / RH NextExperiment */
  description: string
  /** Suggested free-API surfaces */
  freeApiSurfaces: string[]
  costTier: 'low' | 'medium' | 'high'
  experimentType: 'in_silico' | 'literature' | 'assay' | 'other'
  lawReminder: string
}

/** Curated library — attach to Monday pack + RH seed suggestions. */
export const MONDAY_EXPERIMENT_LIBRARY: readonly MondayExperimentTemplate[] = [
  {
    id: 'mon-lit-confirm',
    kind: 'lit_confirm',
    title: 'Literature confirm of lead claim',
    description:
      'Open primary registry/paper for top citable claim; verify quote + source URL before wet-lab.',
    freeApiSurfaces: ['Europe PMC', 'PubMed', 'OpenAlex', 'Semantic Scholar'],
    costTier: 'low',
    experimentType: 'literature',
    lawReminder: 'Not clinical decision support — verify upstream.',
  },
  {
    id: 'mon-safety-tri',
    kind: 'safety_triangulate',
    title: 'Safety triangulation pass',
    description:
      'Cross-check FAERS sample, recalls, labels, and GHS hazards; treat empties as not-retrieved.',
    freeApiSurfaces: ['openFDA FAERS', 'openFDA recalls', 'DailyMed', 'PubChem hazards'],
    costTier: 'low',
    experimentType: 'in_silico',
    lawReminder: 'Spontaneous reports ≠ incidence; empty ≠ safe forever.',
  },
  {
    id: 'mon-target-ortho',
    kind: 'target_orthogonal',
    title: 'Orthogonal target evidence',
    description:
      'Confirm pin hits via ChEMBL mechanisms + DGIdb + Open Targets; note missing axes honestly.',
    freeApiSurfaces: ['ChEMBL', 'DGIdb', 'Open Targets'],
    costTier: 'low',
    experimentType: 'in_silico',
    lawReminder: 'Deterministic Discover rank only — no LLM re-rank.',
  },
  {
    id: 'mon-structure',
    kind: 'structure_check',
    title: 'Structure / identity check',
    description:
      'Confirm CID / InChIKey / PDB or AlphaFold before ordering compound.',
    freeApiSurfaces: ['PubChem', 'RCSB PDB', 'AlphaFold DB', 'UniProt'],
    costTier: 'low',
    experimentType: 'in_silico',
    lawReminder: 'Identity keys before wet-lab purchase.',
  },
  {
    id: 'mon-competitive',
    kind: 'competitive_scan',
    title: 'Competitive landscape scan',
    description:
      'Compare hub side-by-side for 2–3 CIDs on same target; export of-record facts only.',
    freeApiSurfaces: ['Compare hub', 'ChEMBL', 'ClinicalTrials.gov'],
    costTier: 'medium',
    experimentType: 'in_silico',
    lawReminder: 'No invented competitors.',
  },
  {
    id: 'mon-rare-pin',
    kind: 'rare_gene_pin',
    title: 'Rare-disease gene pin confirm',
    description:
      'Orphanet / phenotype gene pins; re-rank only if pins change; accept sparse empties.',
    freeApiSurfaces: ['Orphanet', 'Open Targets', 'ClinVar'],
    costTier: 'low',
    experimentType: 'literature',
    lawReminder: 'Never invent gene–disease associations.',
  },
  {
    id: 'mon-kit-export',
    kind: 'kit_export',
    title: 'Export research kit + Monday pack',
    description:
      'Download research kit + Monday pack JSON; archive content hash for re-open/diff.',
    freeApiSurfaces: ['Data hub', 'Research kit', 'Monday pack'],
    costTier: 'low',
    experimentType: 'other',
    lawReminder: 'Solo + file export default.',
  },
] as const

export function mondayTemplateById(id: string): MondayExperimentTemplate | undefined {
  return MONDAY_EXPERIMENT_LIBRARY.find((t) => t.id === id)
}

export function mondayTemplatesForPersona(
  persona: 'repurposing' | 'rare-disease' | 'competitive' | 'lab-affiliation',
): MondayExperimentTemplate[] {
  const base = [
    mondayTemplateById('mon-lit-confirm')!,
    mondayTemplateById('mon-safety-tri')!,
    mondayTemplateById('mon-structure')!,
    mondayTemplateById('mon-kit-export')!,
  ]
  if (persona === 'rare-disease') {
    return [mondayTemplateById('mon-rare-pin')!, ...base, mondayTemplateById('mon-target-ortho')!]
  }
  if (persona === 'competitive') {
    return [mondayTemplateById('mon-competitive')!, ...base, mondayTemplateById('mon-target-ortho')!]
  }
  if (persona === 'lab-affiliation') {
    return [mondayTemplateById('mon-kit-export')!, mondayTemplateById('mon-lit-confirm')!]
  }
  return [...base, mondayTemplateById('mon-target-ortho')!, mondayTemplateById('mon-competitive')!]
}

/** Agenda bullets for Monday pack document. */
export function mondayLibraryAgenda(
  persona: 'repurposing' | 'rare-disease' | 'competitive' | 'lab-affiliation' = 'repurposing',
  limit = 5,
): string[] {
  return mondayTemplatesForPersona(persona)
    .slice(0, limit)
    .map((t) => `${t.title}: ${t.description}`)
}
