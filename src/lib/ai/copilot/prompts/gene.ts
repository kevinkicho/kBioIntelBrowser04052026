import type { GeneContext } from '@/lib/ai/contextBuilder'
import { geneContextToPromptBlock } from '@/lib/ai/contextBuilder'
import { SYSTEM_PROMPT } from './shared'

export function buildGeneTherapeuticPrompt(ctx: GeneContext): { system: string; user: string } {
  const drugList = ctx.targetedDrugs.slice(0, 15).map(d => `${d.drugName}${d.interactionType ? ` (${d.interactionType})` : ''}`).join('; ')
  const diseaseList = ctx.diseaseAssociations.slice(0, 10).map(d => `${d.diseaseName} (score=${d.score.toFixed(2)})`).join('; ')
  const variantList = ctx.clinvarVariants.slice(0, 8).map(v => `${v.clinicalSignificance}${v.conditionName ? ` — ${v.conditionName}` : ''}`).join('; ')

  const user = `Analyze therapeutic opportunities for the gene ${ctx.symbol} (${ctx.name}).

Gene identity:
- Symbol: ${ctx.symbol} | Name: ${ctx.name} | Type: ${ctx.typeOfGene || 'unknown'}
- Location: chr ${ctx.chromosome || '?'} | Ensembl: ${ctx.ensemblId || '?'} | UniProt: ${ctx.uniprotId || '?'}
- Aliases: ${ctx.aliases.join(', ') || 'none'}
${ctx.summary ? `\nFunction: ${ctx.summary}` : ''}

DRUGS TARGETING THIS GENE:
${drugList || 'No targeted drugs found in data'}

DISEASE ASSOCIATIONS:
${diseaseList || 'No disease associations found'}

CLINICAL VARIANTS:
${variantList || 'No ClinVar data'}

PATHWAYS:
${ctx.pathwayNames.join('; ') || 'No pathway data'}

Provide a therapeutic opportunity analysis:
1. DRUGGABILITY: Is ${ctx.symbol} a druggable target? What type of protein does it encode? Are the existing drugs small molecules, antibodies, or other modalities? What does the interaction type distribution tell us about druggability?
2. DISEASE PRIORITIZATION: Which associated diseases have the strongest evidence and would benefit most from modulating this target? Rank the top 3-5 by therapeutic opportunity (evidence × unmet need).
3. MECHANISM-BASED LINKS: For each prioritized disease, explain the biological logic connecting ${ctx.symbol} to disease pathology. Are there pathway connections that strengthen the case?
4. COMPETITIVE LANDSCAPE: Based on the targeted drugs, who else is already targeting this gene? What modalities are they using? Is the space crowded or open?
5. NEXT EXPERIMENT: What ONE experiment would most advance the case for or against targeting ${ctx.symbol}?

Be specific — cite exact drug names, disease names, interaction types, and scores from the data above.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGeneRepurposingPrompt(ctx: GeneContext): { system: string; user: string } {
  const drugList = ctx.targetedDrugs.map(d => `${d.drugName} [${d.interactionType || 'unknown'}] (sources: ${(d.sources ?? []).slice(0, 2).join(', ')})`).join('\n')
  const diseaseList = ctx.diseaseAssociations.slice(0, 12).map(d => `${d.diseaseName} (score=${d.score.toFixed(2)}, source=${d.source})`).join('\n')

  const user = `Identify drug repurposing opportunities for gene ${ctx.symbol} (${ctx.name}).

${ctx.summary ? `Gene function: ${ctx.summary.slice(0, 300)}` : ''}

DRUGS CURRENTLY TARGETING ${ctx.symbol}:
${drugList || 'No drugs found targeting this gene in available data'}

DISEASES ASSOCIATED WITH ${ctx.symbol}:
${diseaseList || 'No disease data'}

PATHWAYS: ${ctx.pathwayNames.join(', ') || 'No pathway data'}
VARIANTS: ${ctx.clinvarVariants.slice(0, 5).map(v => v.clinicalSignificance).join(', ') || 'No variant data'}

For each repurposing opportunity:
1. EXISTING DRUG → NEW INDICATION: Which drug already targeting ${ctx.symbol} could be repurposed for a different disease? What's the biological logic?
2. EVIDENCE BASE: What in the data supports this? (shared pathways, disease associations, variant data)
3. MECHANISM: How does modulating ${ctx.symbol} in this new context differ from its known use?
4. FEASIBILITY: Is the safety profile of the existing drug compatible with the new indication?
5. VALIDATION: What experiment would test this hypothesis? Be specific about model system, assay, and endpoint.

Generate 3-5 ranked repurposing hypotheses. Prioritize where the drug's known interaction type (inhibitor, agonist, etc.) aligns with the disease biology.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGeneMechanismPrompt(ctx: GeneContext): { system: string; user: string } {
  const drugList = ctx.targetedDrugs.slice(0, 12).map(d => `${d.drugName}: ${d.interactionType || 'unknown interaction'} (${(d.sources ?? []).join(', ')})`).join('\n')
  const pathList = ctx.pathwayNames.join('; ')
  const goList = ctx.goTerms.slice(0, 12).join(', ')

  const user = `Provide a mechanism deep-dive for gene ${ctx.symbol} (${ctx.name}).

${ctx.summary ? `Function: ${ctx.summary}` : ''}

Type: ${ctx.typeOfGene || 'unknown'} | Location: chr ${ctx.chromosome || '?'}
Ensembl: ${ctx.ensemblId || 'N/A'} | UniProt: ${ctx.uniprotId || 'N/A'}

DRUG INTERACTIONS WITH ${ctx.symbol}:
${drugList || 'No drug interaction data'}

PATHWAYS INVOLVED:
${pathList || 'No pathway data'}

GENE ONTOLOGY:
${goList || 'No GO terms'}

DISEASE ASSOCIATIONS (top 5):
${ctx.diseaseAssociations.slice(0, 5).map(d => `- ${d.diseaseName} (score=${d.score.toFixed(2)})`).join('\n') || 'No disease data'}

Analyze:
1. PROTEIN FUNCTION: Based on the function summary and GO terms, what is the protein product of ${ctx.symbol} actually doing in the cell? What is its molecular role?
2. DRUG MODALITY ANALYSIS: Group the drugs by interaction type. Are most inhibitors? Agonists? Allosteric modulators? What does this distribution reveal about the target's druggability and the approaches that have worked (or failed)?
3. PATHWAY CONTEXT: How does ${ctx.symbol} fit into the biological pathways listed? Is it upstream (regulator), downstream (effector), or a central hub? What happens when its activity changes?
4. ON-TARGET vs OFF-TARGET: For the top 3 drugs, which effects are likely on-target (directly from ${ctx.symbol} modulation) vs. off-target?
5. GAP ASSESSMENT: What key mechanistic questions remain unanswered? What experiment would clarify the mechanism most?`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGeneTargetAssessmentPrompt(ctx: GeneContext): { system: string; user: string } {
  const drugCount = ctx.targetedDrugs.length
  const inhibitorCount = ctx.targetedDrugs.filter(d => d.interactionType?.toLowerCase().includes('inhibitor') || d.interactionType?.toLowerCase().includes('antagonist') || d.interactionType?.toLowerCase().includes('blocker')).length
  const agonistCount = ctx.targetedDrugs.filter(d => d.interactionType?.toLowerCase().includes('agonist') || d.interactionType?.toLowerCase().includes('activator')).length
  const diseaseCount = ctx.diseaseAssociations.length
  const pathogenCount = ctx.clinvarVariants.filter(v => v.clinicalSignificance?.toLowerCase().includes('pathogenic')).length
  const benignCount = ctx.clinvarVariants.filter(v => v.clinicalSignificance?.toLowerCase().includes('benign')).length

  const topDrugs = ctx.targetedDrugs.slice(0, 8).map(d => `${d.drugName} [${d.interactionType || '?'}]`).join(', ')
  const topDiseases = ctx.diseaseAssociations.slice(0, 8).map(d => `${d.diseaseName} (${d.score.toFixed(2)})`).join(', ')

  const user = `Assess ${ctx.symbol} (${ctx.name}) as a therapeutic target.

TARGET PROFILE:
- Gene: ${ctx.symbol} | Type: ${ctx.typeOfGene || 'unknown'} | Location: chr ${ctx.chromosome || '?'}
- Druggability indicators: ${drugCount} known drug interactions (${inhibitorCount} inhibitors/antagonists, ${agonistCount} agonists/activators)
- Disease associations: ${diseaseCount} diseases linked
- Variants: ${pathogenCount} pathogenic, ${benignCount} benign, ${ctx.clinvarVariants.length - pathogenCount - benignCount} VUS/other
${ctx.summary ? `- Function: ${ctx.summary.slice(0, 200)}` : ''}

TOP DRUGS: ${topDrugs || 'None found'}
TOP DISEASES: ${topDiseases || 'None found'}
ALIASES: ${ctx.aliases.join(', ') || 'none'}
ENSEMBL: ${ctx.ensemblId || 'N/A'} | UniProt: ${ctx.uniprotId || 'N/A'}
PATHWAYS: ${ctx.pathwayNames.join(', ') || 'None found'}

Assess:
1. DRUGGABILITY SCORE: On a scale of Low/Medium/High, how druggable is ${ctx.symbol}? Justify with: protein class (enzyme, receptor, TF, etc.), existing drug evidence, and structural considerations.
2. MODALITY FIT: Which therapeutic modality is most appropriate — small molecule, antibody, RNA therapeutic, gene therapy? What does the existing drug evidence suggest?
3. SAFETY CONCERNS: Based on the gene's function and ${pathogenCount} pathogenic variants, what are the potential on-target toxicity risks of modulating ${ctx.symbol}? Would inhibition or activation be more likely to cause problems?
4. COMPETITIVE INTELLIGENCE: How crowded is this target space? Are the existing drugs for approved indications only, or are there investigational compounds? What's the modality split?
5. INVESTMENT CASE: Bottom line — should a drug discovery team invest in this target? What's the strongest rationale? What's the biggest risk?

Be direct and actionable. A researcher needs to decide whether to pursue this target.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildGeneQAPrompt(ctx: GeneContext, question: string): { system: string; user: string } {
  const user = `The user asks: "${question}"

IMPORTANT: Answer as a drug discovery researcher focused on this gene target. Every statement should answer "so what?" — what does this mean for druggability, therapeutic opportunity, or the next experiment?

Gene context for ${ctx.symbol} (${ctx.name}):
${geneContextToPromptBlock(ctx)}

Answer the question using the available data. Be specific — cite drug names, disease associations, interaction types, and scores. If the data is insufficient, explain what's missing and suggest specific experiments or databases that would fill the gap.`

  return { system: SYSTEM_PROMPT, user }
}
