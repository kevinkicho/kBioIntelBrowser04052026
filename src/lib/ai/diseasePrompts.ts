import type { GeneAssociation } from '../diseaseSearch'

export interface DiseaseDetailContext {
  diseaseName: string
  description?: string
  therapeuticAreas: string[]
  genes: GeneAssociation[]
  drugInterventions: { name: string; trialCount: number }[]
  molecules: { name: string; cid: number | null; sources: string[] }[]
  trialSummary: {
    total: number
    recruiting: number
    phases: Record<string, number>
  }
}

const GENE_LIMIT = 20
const DRUG_LIMIT = 15
const MOLECULE_LIMIT = 15

const DISEASE_SYSTEM_PROMPT = `You are BioIntel Copilot, a drug discovery researcher embedded in a bioinformatics explorer with data from 112+ scientific databases. Your job is to find NON-OBVIOUS connections that a researcher scanning the same data would miss.

CRITICAL: You must NEVER produce secretary output. Secretary output is data recitation — restating what the data says without interpretation. You must ALWAYS produce researcher output — drawing conclusions the data supports but doesn't explicitly state.

BAD (secretary — NEVER do this):
"This disease has 45 gene associations and 12 clinical trials. The top gene is APOE with score 0.95. There are 8 drugs being tested."
→ This just repeats counts. Anyone can read the data.

GOOD (researcher — ALWAYS do this):
"APOE (score 0.95) encodes the primary cholesterol transporter in the brain — its strong association with Alzheimer's is expected, but what's notable is that 3 of the 8 trial drugs (atorvastatin, simvastatin, pravastatin) are HMG-CoA reductase inhibitors, which operate upstream of APOE in the cholesterol metabolism pathway. This suggests the field is pursuing a lipid-mediated neuroprotection hypothesis, yet none target APOE directly — indicating the gene is considered 'undruggable' by conventional small molecules, leaving an opportunity for protein-protein interaction disruptors or antisense approaches."
→ This connects gene data to trial drug data, identifies a mechanistic gap, and proposes a concrete research direction.

Your rules:
1. SYNTHESIZE across domains. Connect genes to drugs, drugs to pathways, pathways to therapeutic areas. The value you add is the CONNECTION.
2. NAME SPECIFICS — cite gene symbols, scores, drug names, trial counts, not vague categories.
3. REASON about mechanism. When you see a gene, a targeting drug, and a therapeutic area, explain the biological causal chain.
4. HIGHLIGHT GAPS. A gene with no targeting drug is a therapeutic gap. A pathway with no clinical trial is a translational gap. These are insights, not just observations.
5. BE ACTIONABLE. Propose specific experiments, drug candidates, or follow-up queries — not "further research is needed."
6. RESPECT SUBSETS. Data may be truncated (e.g. "top 20 of 87 genes"). Reason from what you see but acknowledge what's missing.

You are concise — 2-4 sentences per insight unless elaborating on request. You use correct scientific terminology.`

function formatGenesTable(genes: GeneAssociation[], limit: number): string {
  if (genes.length === 0) return '  (none found)'
  const top = genes.slice(0, limit)
  const remainder = genes.length - top.length
  const lines = top.map(g =>
    `  - ${g.geneSymbol} | score=${g.score.toFixed(2)} | source=${g.source}${g.entrezId ? ` | Entrez=${g.entrezId}` : ''}`
  )
  if (remainder > 0) lines.push(`  ... and ${remainder} more lower-confidence gene associations`)
  return lines.join('\n')
}

function formatDrugsTable(drugs: { name: string; trialCount: number }[], limit: number): string {
  if (drugs.length === 0) return '  (none found)'
  const top = drugs.slice(0, limit)
  const remainder = drugs.length - top.length
  const lines = top.map(d =>
    `  - ${d.name} | ${d.trialCount} trial${d.trialCount !== 1 ? 's' : ''}`
  )
  if (remainder > 0) lines.push(`  ... and ${remainder} more drugs with fewer trials`)
  return lines.join('\n')
}

function formatMoleculesTable(molecules: { name: string; cid: number | null; sources: string[] }[], limit: number): string {
  if (molecules.length === 0) return '  (none found)'
  const top = molecules.slice(0, limit)
  const remainder = molecules.length - top.length
  const lines = top.map(m =>
    `  - ${m.name} | ${m.cid != null ? `CID ${m.cid}` : 'no PubChem entry'} | from=${m.sources.join(',')}`
  )
  if (remainder > 0) lines.push(`  ... and ${remainder} more candidate molecules`)
  return lines.join('\n')
}

function formatTrialSummary(s: { total: number; recruiting: number; phases: Record<string, number> }): string {
  const phases = Object.entries(s.phases).map(([k, v]) => `${k}=${v}`).join(', ')
  return `${s.total} total (${s.recruiting} recruiting)${phases ? ` | ${phases}` : ''}`
}

function buildDataContextBlock(ctx: DiseaseDetailContext): string {
  const lines: string[] = []
  lines.push(`=== DISEASE: ${ctx.diseaseName} ===`)
  if (ctx.description) lines.push(`Description: ${ctx.description.slice(0, 300)}`)
  if (ctx.therapeuticAreas.length > 0) lines.push(`Therapeutic areas: ${ctx.therapeuticAreas.join(', ')}`)
  lines.push('')
  lines.push(`ASSOCIATED GENES (${ctx.genes.length} total, showing top ${Math.min(ctx.genes.length, GENE_LIMIT)}):`)
  lines.push(formatGenesTable(ctx.genes, GENE_LIMIT))
  lines.push('')
  lines.push(`DRUGS IN CLINICAL TRIALS (${ctx.drugInterventions.length} total, showing top ${Math.min(ctx.drugInterventions.length, DRUG_LIMIT)}):`)
  lines.push(formatDrugsTable(ctx.drugInterventions, DRUG_LIMIT))
  lines.push('')
  lines.push(`RELATED MOLECULES (${ctx.molecules.length} total, showing top ${Math.min(ctx.molecules.length, MOLECULE_LIMIT)}):`)
  lines.push(formatMoleculesTable(ctx.molecules, MOLECULE_LIMIT))
  lines.push('')
  lines.push(`CLINICAL TRIAL LANDSCAPE:`)
  lines.push(formatTrialSummary(ctx.trialSummary))
  return lines.join('\n')
}

function geneMentionsSymbol(name: string, symbol: string): boolean {
  try {
    return new RegExp(`\\b${escapeRegex(symbol)}\\b`, 'i').test(name)
  } catch {
    return name.toLowerCase() === symbol.toLowerCase()
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findGenesWithoutDrugs(
  genes: GeneAssociation[],
  drugInterventions: { name: string; trialCount: number }[],
  molecules: { name: string; cid: number | null; sources: string[] }[],
): GeneAssociation[] {
  const allNames = [
    ...drugInterventions.map(d => d.name),
    ...molecules.map(m => m.name),
  ]
  return genes.filter(g =>
    !allNames.some(name => geneMentionsSymbol(name, g.geneSymbol))
  )
}

export function buildDiseaseQuickSummaryPrompt(ctx: DiseaseDetailContext): { system: string; user: string } {
  const dataBlock = buildDataContextBlock(ctx)

  const noDataNote =
    ctx.genes.length === 0 && ctx.drugInterventions.length === 0 && ctx.molecules.length === 0
      ? `\nNOTE: This disease has no gene associations, trial drugs, or related molecules in the current data. Work with the disease name, description, and therapeutic areas alone. Suggest which databases or queries would likely produce richer data.`
      : ''

  const user = `Provide a concise research intelligence summary for ${ctx.diseaseName}. This will be shown to a researcher immediately — they already see the raw data below, so do NOT recapitulate it.

Instead, provide 2-3 paragraphs answering:
1. What is the dominant mechanistic narrative connecting the top gene associations to this disease?
2. What is the most surprising or non-obvious finding when you cross-reference the gene data with the drugs in trials? (e.g., a gene strongly associated with the disease that has NO targeting drug in trials = therapeutic gap; or a drug in trials that targets a gene with a surprisingly low association score)
3. What should the researcher investigate next? Name a specific gene, drug, or pathway.

${dataBlock}
${noDataNote}
Be specific — cite gene symbols, drug names, and scores. A researcher reading this should learn something they wouldn't get from scanning the tables.`

  return { system: DISEASE_SYSTEM_PROMPT, user }
}

export function buildDiseaseRepurposingPrompt(ctx: DiseaseDetailContext): { system: string; user: string } {
  const dataBlock = buildDataContextBlock(ctx)

  const reducedNote =
    ctx.drugInterventions.length === 0
      ? `\nNOTE: No drugs are currently listed in clinical trials for this disease. This means the repurposing opportunity is wide open — any drug targeting the associated genes is a candidate.`
      : ctx.genes.length === 0
        ? `\nNOTE: No gene associations are available for this disease. Reason from the disease name, description, therapeutic areas, and any related molecules listed.`
        : ''

  const user = `Analyze drug repurposing opportunities for ${ctx.diseaseName}.

The drugs listed in clinical trials are ALREADY being tested for this disease. Your job is to find EXISTING approved drugs (for OTHER conditions) that target the same genes or pathways and could be repurposed — but are NOT yet in trials for ${ctx.diseaseName}.

Strategy:
- Look at the top gene associations. These are the molecular targets that matter.
- Check which genes are targeted by drugs in the "Related Molecules" list — those drugs may already be approved for other conditions.
- Identify genes in the association list that are NOT targeted by any drug in trials or related molecules — then reason about what existing drugs (approved for other conditions) COULD target them based on known pharmacology.

For each repurposing candidate (generate 3-5):
1. DRUG: Name the specific existing drug
2. CURRENT INDICATION: What it's approved/used for now
3. GENE TARGET: Which disease-associated gene does it hit?
4. BIOLOGICAL LOGIC: How does targeting this gene address ${ctx.diseaseName}'s pathophysiology?
5. REPURPOSING EVIDENCE: Gene score, pathway overlap, or pharmacological rationale
6. NEXT STEP: Specific experiment to validate (cell line + assay + endpoint)

${dataBlock}
${reducedNote}
Rank by mechanistic plausibility and safety profile (an approved drug with known safety is more feasible than an experimental compound).`

  return { system: DISEASE_SYSTEM_PROMPT, user }
}

export function buildDiseaseTherapeuticGapPrompt(ctx: DiseaseDetailContext): { system: string; user: string } {
  const dataBlock = buildDataContextBlock(ctx)

  const genesWithoutDrugs = findGenesWithoutDrugs(ctx.genes, ctx.drugInterventions, ctx.molecules)

  let gapBlock: string
  if (ctx.genes.length === 0) {
    gapBlock = 'No gene associations available for this disease. Cannot perform therapeutic gap analysis on genes. Instead, reason from the disease name and therapeutic areas about which genes are likely involved and assess their druggability.'
  } else if (genesWithoutDrugs.length > 0) {
    gapBlock = `GENES WITH NO TARGETING DRUG/MOLECULE IN CURRENT DATA (${genesWithoutDrugs.length} of ${ctx.genes.length} genes):\n` +
      formatGenesTable(genesWithoutDrugs, 20)
  } else {
    gapBlock = 'All top gene associations appear to have at least one name-matched drug or molecule in the data. However, examine whether the targeting is DIRECT (drug designed for that gene product) or INDIRECT (drug hits the gene\'s pathway but not the gene product itself).'
  }

  const user = `Perform a therapeutic gap analysis for ${ctx.diseaseName}. The goal is to identify which disease-associated genes are "undruggable" or lack any pharmacological intervention — these are the areas where new drug discovery is most needed.

${gapBlock}

${dataBlock}

For each therapeutic gap (generate 3-5):
1. GENE: The specific gene symbol and its association score
2. WHY UNDRUGGABLE: Is it a transcription factor? A structural protein? A non-enzymatic target? What makes it hard to drug?
3. DRUGGABILITY ASSESSMENT: What modality could work? (small molecule, antibody, PROTAC, antisense, gene therapy, RNAi)
4. APPROACHABLE PATHWAY: Even if the gene itself is undruggable, is there a druggable upstream regulator or downstream effector? Name it.
5. EXPERIMENTAL VALIDATION: What assay would confirm that modulating this gene/pathway affects the disease phenotype? (specific cell line + readout)
6. COMPETITIVE SPACE: Is anyone else pursuing this? Check if the gene name appears in any trial drug context above.

Also address: Are there entire pathways or therapeutic areas that are well-served by existing drugs, creating a contrast with the undruggable gaps? This contrast highlights where investment should focus.`

  return { system: DISEASE_SYSTEM_PROMPT, user }
}

export function buildDiseaseConnectionMapPrompt(ctx: DiseaseDetailContext): { system: string; user: string } {
  const dataBlock = buildDataContextBlock(ctx)

  const reducedNote =
    ctx.genes.length === 0
      ? `\nNOTE: No gene associations are available. Map connections from the disease name, therapeutic areas, and any molecules/drugs in the data.`
      : ctx.drugInterventions.length === 0 && ctx.molecules.length === 0
        ? `\nNOTE: No drugs or molecules are available. Map gene-to-disease connections only and identify which genes are most therapeutically actionable.`
        : ''

  const user = `Map the connections between ${ctx.diseaseName}'s gene associations and the drugs/compounds in the data. This is a synthesis that shows how the known pharmacological interventions connect to the disease biology through its genetic architecture.

For each significant connection:
1. GENES → DISEASE: Which genes have the strongest association and what is their known role in the disease pathophysiology?
2. DRUGS → GENES: Which trial drugs target which disease-associated genes? Are they hitting the highest-scored genes or lower-scored ones? What does this pattern tell us about the field's mechanistic hypotheses?
3. MISSING LINKS: Which top-scoring genes have NO targeting drug? Which drugs target genes with LOW association scores? What does this mismatch suggest?
4. CROSS-CUTTING PATHWAYS: Do multiple drugs hit different genes in the same pathway? Name the pathway and the drug-gene pairs.
5. SURPRISING CONNECTIONS: Is there a drug targeting a gene that's weakly associated but strongly connected to a top-scoring gene via a known protein-protein interaction? Or a molecule that appears in the data but whose connection to the disease is unclear?

Provide a text-based "wiring diagram" of the disease-gene-drug network. Use a format like:
  APOE (score 0.95) ← atorvastatin (3 trials) [cholesterol metabolism pathway]
  TREM2 (score 0.82) ← [NO TARGETING DRUG — GAP] [microglial activation pathway]
  MAPT (score 0.71) ← lithium (2 trials) [tau phosphorylation pathway]

After the wiring diagram, provide 2-3 sentences of synthesis: what is the overall shape of the therapeutic landscape? What is over-invested vs. under-invested?

${dataBlock}
${reducedNote}`

  return { system: DISEASE_SYSTEM_PROMPT, user }
}