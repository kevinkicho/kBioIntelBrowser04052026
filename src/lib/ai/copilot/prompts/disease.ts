import { SYSTEM_PROMPT } from './shared'

export function buildDiseaseAutoInsightPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Analyze the disease search results below. Do NOT just list what was found — instead, identify 3-4 genuinely surprising scientific findings that connect diseases, molecules, and therapeutic areas.

For each finding:
- State the SPECIFIC observation with exact disease names, molecule targets, and therapeutic areas
- Explain the clinical or therapeutic SIGNIFICANCE — why does this matter?
- Connect it to at least ONE other result (e.g., shared molecules across diseases, overlapping therapeutic areas suggesting repurposing opportunities)

BAD EXAMPLE: "Found 3 diseases: Diabetes, Type 2 diabetes, and Diabetic neuropathy. They have some molecules."
GOOD EXAMPLE: "Type 2 diabetes and hypertension share therapeutic area overlap in metabolic disease — and both list Metformin as a candidate molecule, suggesting a common mechanism (AMPK activation) that could be leveraged for patients with comorbid metabolic syndrome."

${diseaseContext}

IMPORTANT: Your insights should teach a researcher something they wouldn't get from just reading the list. Synthesize across the disease results to find non-obvious connections.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseQAPrompt(diseaseContext: string, question: string): { system: string; user: string } {
  const user = `The user asks: "${question}"

IMPORTANT: Answer as a drug discovery researcher, not a data reporter. If you just list data points without interpretation, you have failed. Every statement should answer "so what?" — what does this data mean for the disease, the therapeutic landscape, or the next experiment?

${diseaseContext}

Answer the question using the available disease data. Be specific — cite disease names, molecule targets, and sources from the context. If the data is insufficient to answer fully, explain what's missing and suggest specific searches or experiments that would fill the gap. Do NOT just repeat what's in the data — explain the science and therapeutic implications.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchBriefPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Write an executive intelligence brief summarizing the disease search results. Structure it as:

1. LANDSCAPE OVERVIEW: What disease area are we looking at? Name the key conditions and how they relate (comorbidities, disease subtypes, spectrum disorders). Cite specific disease names and therapeutic areas.
2. KEY ASSETS: Which candidate molecules appear across multiple diseases? These shared molecules suggest cross-disease therapeutic potential — name them and explain the biological logic of why they appear.
3. STRATEGIC GAPS: Which diseases have NO candidate molecules? What does this mean — are they understudied, or are they genetically complex conditions that lack clear druggable targets?
4. NEXT QUERY: What specific disease or molecule should the researcher investigate next? Suggest a concrete action (e.g., "Search for [disease name] to explore its gene associations" or "Look up [molecule name]'s mechanism of action").

${diseaseContext}

Be concise — 1-2 sentences per section. Focus on what a decision-maker needs to know, not data recitation.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchGapPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Analyze data gaps across the disease search results. Focus on what is MISSING and what that means.

For each significant gap:
1. DISEASES WITHOUT MOLECULES: Which diseases have no candidate molecules? Is this because they're rare/understudied, because their biology makes them hard to target, or because the search may have missed sources? Name the specific diseases.
2. THERAPEUTIC AREAS WITHOUT CANDIDATES: Are there therapeutic areas represented by diseases in the results that have NO molecules targeting them? This indicates a therapeutic desert.
3. DATA SOURCE GAPS: Which diseases come from only ONE source (e.g., only Open Targets, not DisGeNET or Orphanet)? These may have incomplete associations.
4. WHAT TO SEARCH NEXT: Which diseases with no molecules should the researcher click into to discover their gene associations and potential drug targets? Name 2-3 specific diseases and explain why they're worth investigating.

${diseaseContext}

Do NOT just list counts. Explain WHY each gap matters and what it implies for the research strategy.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchRepurposingPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Identify drug repurposing opportunities from the disease search results. The key signal is SHARED MOLECULES across different diseases — a drug that appears for multiple conditions may have unexplored therapeutic potential.

Strategy:
- Find molecules that appear in MORE THAN ONE disease result. These are your starting points.
- For each shared molecule, consider: is it already known to treat all those conditions, or does its appearance in a new disease context suggest a repurposing opportunity?
- Also consider: molecules that appear for ONE disease but target pathways shared with other diseases in the results — these are latent repurposing candidates.

For each repurposing opportunity (generate 2-4):
1. MOLECULE: Name and CID (if available)
2. KNOWN DISEASE: Where it's already established
3. TARGET DISEASE: A different disease from the results where it could be repurposed
4. BIOLOGICAL RATIONALE: Why might this work? (shared therapeutic areas, overlapping disease biology, known mechanism applicable to new condition)
5. EVIDENCE STRENGTH: Strong (molecule explicitly listed for target disease), Moderate (shared pathway/therapeutic area), or Speculative (biological plausibility only)
6. NEXT STEP: What should the researcher do to verify? (specific search, clinical trial query, or experiment)

${diseaseContext}

Prioritize opportunities with the strongest cross-disease signals. Do not suggest repurposing without a mechanistic rationale.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchMechanismPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Analyze the shared biological mechanisms and pathways across the disease search results. The goal is to understand the mechanistic connections BETWEEN diseases, not just within each disease.

Focus on:
1. CONVERGENT PATHWAYS: Do multiple diseases share therapeutic areas? If so, what biological pathway or process underlies that convergence? Name specific pathways and the diseases connected by them.
2. DIVERGENT MECHANISMS: Are there diseases in the same therapeutic area with DIFFERENT candidate molecules? This suggests mechanistic heterogeneity — the same clinical phenotype may have distinct molecular drivers.
3. MOLECULE-TO-MECHANISM MAPPING: For key molecules that appear in the results, what is their known mechanism of action? How does it relate to the disease biology? If the MoA is unknown, flag it.
4. MECHANISTIC HIERARCHY: Rank the diseases by how well-understood their mechanism is (based on available molecule data). Which ones are mechanistically clear vs. black boxes?
5. CROSS-DISEASE MECHANISM: If a molecule appears for one disease but its mechanism is relevant to another disease in the results, describe the biological logic.

${diseaseContext}

Synthesize mechanisms across diseases. The value is in the CROSS-DISEASE connections, not the within-disease descriptions.`

  return { system: SYSTEM_PROMPT, user }
}

export function buildDiseaseSearchHypothesisPrompt(diseaseContext: string): { system: string; user: string } {
  const user = `Generate novel therapeutic hypotheses based on the disease search results. This is the most creative/speculative analysis — propose ideas that the data supports but does not explicitly state.

For each hypothesis (generate 3-5):
1. HYPOTHESIS: A clear, falsifiable statement about treating a disease or condition
2. DISEASE TARGET: Which disease from the results this addresses
3. MOLECULAR STRATEGY: What molecule, target, or biological intervention would you propose? Name specifics from the data or from known pharmacology.
4. BIOLOGICAL LOGIC: The causal chain from intervention → mechanism → disease modification. Be specific about pathway names, gene families, or molecular processes.
5. NOVELTY: Why is this NOT obvious? What makes it different from standard-of-care or currently investigated approaches?
6. FALSIFICATION: What experiment or observation would DISPROVE this hypothesis? A good hypothesis is one you can kill.

Cross-reference: If multiple diseases share molecules or pathways, consider combination strategies or cross-indication approaches. If a disease has NO molecules, propose a gene- or pathway-based strategy grounded in the disease's therapeutic area.

${diseaseContext}

Be bold but rigorous. Every hypothesis must have a biological rationale, not just pattern-matching. Avoid restating known facts as hypotheses.`

  return { system: SYSTEM_PROMPT, user }
}
