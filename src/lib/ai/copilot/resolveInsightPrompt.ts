/**
 * Pure insight prompt resolution by entity domain + mode.
 * Keeps useAICopilot free of nested switch trees.
 */

import type { MoleculeContext, GeneContext } from '@/lib/ai/copilot/context'
import type { RetrievalSnapshot } from '@/lib/ai/retrievalMonitor'
import {
  buildAutoInsightPrompt,
  buildExecutiveBriefPrompt,
  buildGapAnalysisPrompt,
  buildSafetyDeepDivePrompt,
  buildMechanismAnalysisPrompt,
  buildTherapeuticHypothesisPrompt,
  buildCompetitivePositionPrompt,
  buildRepurposingScanPrompt,
  buildCrossMoleculeComparePrompt,
  buildDiseaseAutoInsightPrompt,
  buildDiseaseSearchBriefPrompt,
  buildDiseaseSearchGapPrompt,
  buildDiseaseSearchRepurposingPrompt,
  buildDiseaseSearchMechanismPrompt,
  buildDiseaseSearchHypothesisPrompt,
  buildGeneTherapeuticPrompt,
  buildGeneRepurposingPrompt,
  buildGeneMechanismPrompt,
  buildGeneTargetAssessmentPrompt,
  buildPriorArtQueryPrompt,
  buildDifferentialSafetyPrompt,
  buildSuggestNextPrompt,
  buildHypothesisSeedPrompt,
  type PromptMode,
  type SessionMoleculeSummary,
} from '@/lib/ai/copilot/prompts'

export type InsightPrompt = { system: string; user: string }

export interface ResolveInsightPromptInput {
  mode: PromptMode
  isDiseaseContext: boolean
  isGeneContext: boolean
  diseaseContextBlock?: string | null
  geneCtx?: GeneContext | null
  moleculeCtx: MoleculeContext
  snapshot: RetrievalSnapshot
  /** For cross_molecule_compare */
  otherSessionMolecules?: SessionMoleculeSummary[]
  /** For differential_safety */
  diffTarget?: SessionMoleculeSummary | null
  /** For hypothesis_seed */
  researchQuestion?: string
}

/**
 * Select system/user prompts for an insight mode without streaming side effects.
 */
export function resolveInsightPrompt(input: ResolveInsightPromptInput): InsightPrompt {
  const { mode } = input

  if (input.isDiseaseContext && input.diseaseContextBlock) {
    const block = input.diseaseContextBlock
    switch (mode) {
      case 'auto_insight':
        return buildDiseaseAutoInsightPrompt(block)
      case 'executive_brief':
        return buildDiseaseSearchBriefPrompt(block)
      case 'gap_analysis':
        return buildDiseaseSearchGapPrompt(block)
      case 'mechanism_analysis':
        return buildDiseaseSearchMechanismPrompt(block)
      case 'therapeutic_hypothesis':
        return buildDiseaseSearchHypothesisPrompt(block)
      case 'repurposing_scan':
        return buildDiseaseSearchRepurposingPrompt(block)
      default:
        return buildDiseaseAutoInsightPrompt(block)
    }
  }

  if (input.isGeneContext && input.geneCtx) {
    const geneCtx = input.geneCtx
    switch (mode) {
      case 'auto_insight':
      case 'gene_therapeutic':
        return buildGeneTherapeuticPrompt(geneCtx)
      case 'gene_repurposing':
        return buildGeneRepurposingPrompt(geneCtx)
      case 'gene_mechanism':
        return buildGeneMechanismPrompt(geneCtx)
      case 'gene_target_assessment':
        return buildGeneTargetAssessmentPrompt(geneCtx)
      case 'executive_brief':
        return buildGeneTherapeuticPrompt(geneCtx)
      case 'gap_analysis':
        return buildGeneTargetAssessmentPrompt(geneCtx)
      default:
        return buildGeneTherapeuticPrompt(geneCtx)
    }
  }

  const context = input.moleculeCtx
  const snapshot = input.snapshot

  switch (mode) {
    case 'auto_insight':
      return buildAutoInsightPrompt(context, snapshot)
    case 'executive_brief':
      return buildExecutiveBriefPrompt(context, snapshot)
    case 'gap_analysis':
      return buildGapAnalysisPrompt(context, snapshot)
    case 'safety_deep_dive':
      return buildSafetyDeepDivePrompt(context)
    case 'mechanism_analysis':
      return buildMechanismAnalysisPrompt(context)
    case 'therapeutic_hypothesis':
      return buildTherapeuticHypothesisPrompt(context)
    case 'competitive_position':
      return buildCompetitivePositionPrompt(context)
    case 'repurposing_scan':
      return buildRepurposingScanPrompt(context)
    case 'cross_molecule_compare':
      return buildCrossMoleculeComparePrompt(context, input.otherSessionMolecules ?? [])
    case 'prior_art_query':
      return buildPriorArtQueryPrompt(context)
    case 'differential_safety':
      return buildDifferentialSafetyPrompt(context, input.diffTarget!)
    case 'suggest_next':
      return buildSuggestNextPrompt(context)
    case 'hypothesis_seed':
      return buildHypothesisSeedPrompt(context, input.researchQuestion ?? '')
    default:
      return buildAutoInsightPrompt(context, snapshot)
  }
}

export function isCopilotTaskMode(mode: PromptMode): boolean {
  return (
    mode === 'prior_art_query' ||
    mode === 'differential_safety' ||
    mode === 'suggest_next' ||
    mode === 'hypothesis_seed'
  )
}
