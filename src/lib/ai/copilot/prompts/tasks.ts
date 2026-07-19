import type { MoleculeContext } from '@/lib/ai/contextBuilder'
import type { SessionMoleculeSummary } from './types'
import { SYSTEM_PROMPT } from './shared'

// PLAN 06: AI tasks beyond summarization — structured output validated by post-processors

export function buildPriorArtQueryPrompt(context: MoleculeContext): { system: string; user: string } {
  const synonyms = (context.identity.synonyms ?? []).slice(0, 6)
  const targets = context.rich.topTargetActivities.slice(0, 4).map(t => t.targetName).filter(Boolean)
  const mechanisms = context.rich.mechanismDetails.slice(0, 3).map(m => m.mechanismOfAction).filter(Boolean)
  const indications = context.rich.indicationDetails.slice(0, 4).map(i => i.condition).filter(Boolean)

  const system = `You are a patent-search query generator. Your ONLY job is to return a Boolean query string. You output NOTHING ELSE — no preamble, no explanation, no markdown, no code fence, no quotes around the whole result. Just the raw query on a single line.`

  const user = `Generate a Boolean search query for prior-art / patent search for the molecule "${context.identity.name}".

Use this data to build the query:
- Primary name: ${context.identity.name}
- Synonyms: ${synonyms.length > 0 ? synonyms.join(', ') : '(none — use the primary name only)'}
- Top biological targets: ${targets.length > 0 ? targets.join(', ') : '(none)'}
- Mechanisms: ${mechanisms.length > 0 ? mechanisms.join(', ') : '(none)'}
- Indications / clinical context: ${indications.length > 0 ? indications.join(', ') : '(none)'}

Output format requirements (STRICT):
- A SINGLE LINE Boolean query
- Use double quotes around multi-word terms
- Use OR to group synonyms of the molecule
- Use AND to require a target / mechanism
- Optionally use OR to broaden indication context inside parentheses
- Use balanced parentheses to group terms
- The query MUST contain the primary molecule name "${context.identity.name}"
- Do NOT include explanation, prose, or markdown
- Do NOT wrap the entire output in quotes
- Do NOT prefix with "Query:" or anything similar

Example of well-formed output (do NOT copy verbatim — generate one for the molecule above):
("aspirin" OR "acetylsalicylic acid") AND ("cyclooxygenase" OR "COX-1" OR "COX-2") AND (prevention OR therapy OR treatment)

Now produce the query for "${context.identity.name}":`

  return { system, user }
}

/**
 * Differential safety profile between current molecule and one previously-viewed
 * molecule. Output is 3-5 short paragraphs.
 */
export function buildDifferentialSafetyPrompt(context: MoleculeContext, other: SessionMoleculeSummary): { system: string; user: string } {
  // Truncate intelligently for 7B models — top 5 AEs, top 3 mechanisms, top 3 regulatory facts each.
  const currentAEs = context.rich.topAdverseEvents.slice(0, 5).map(ae => `${ae.reactionName} (${ae.count} reports, ${ae.serious} serious)`).join('; ') || 'none reported'
  const currentMechs = context.rich.mechanismDetails.slice(0, 3).map(m => `${m.mechanismOfAction} -> ${m.targetName}`).join('; ') || 'unknown'
  const currentRegFacts = [
    `Risk: ${context.safety.overallRisk}`,
    `Boxed warning: ${context.safety.hasBoxedWarning ? 'YES' : 'No'}`,
    `Recalls: ${context.safety.recallCount}`,
  ].slice(0, 3).join(' | ')
  const currentInds = context.rich.indicationDetails.slice(0, 3).map(i => i.condition).filter(Boolean).join(', ') || 'none listed'

  const otherAEs = other.topAEs.slice(0, 5).join('; ') || 'none reported'
  const otherMechs = other.mechanisms.slice(0, 3).join('; ') || 'unknown'
  const otherInds = other.indications.slice(0, 3).join(', ') || 'none listed'

  const user = `Write a differential safety profile contrasting two drugs. Both molecule names MUST appear by name in your output.

CURRENT MOLECULE: ${context.identity.name} (CID ${context.identity.cid})
- Mechanisms: ${currentMechs}
- Top adverse events: ${currentAEs}
- Regulatory: ${currentRegFacts}
- Indications: ${currentInds}

COMPARISON MOLECULE: ${other.name}
- Mechanisms: ${otherMechs}
- Top adverse events: ${otherAEs}
- Indications: ${otherInds}

Produce 3-5 short paragraphs. Each paragraph is a single block of text separated from the next by a BLANK LINE. Cover, in order:

1. SHARED ADVERSE EVENTS — Which AEs appear in both, and what does the overlap suggest mechanistically?
2. DIVERGENT RISKS — Which AEs are unique to one drug? Why?
3. SEVERITY COMPARISON — Which drug has the more concerning serious-event profile, and why?
4. REGULATORY STATUS — How do approval / boxed-warning / recall histories differ?

Rules:
- Both names "${context.identity.name}" and "${other.name}" MUST appear at least once
- 3 to 5 paragraphs total — no more, no fewer
- Separate each paragraph with a BLANK line (one empty newline between paragraphs)
- Do NOT use bullet points or numbered lists — use prose paragraphs
- Do NOT include a title or heading
- Be specific — name the AEs, not "various adverse events"`

  return { system: SYSTEM_PROMPT, user }
}

/**
 * Suggest 3-5 next entities to explore. Output is a JSON code block.
 */
export function buildSuggestNextPrompt(context: MoleculeContext): { system: string; user: string } {
  const targets = context.rich.topTargetActivities.slice(0, 6).map(t => t.targetName).filter(Boolean)
  const mechanisms = context.rich.mechanismDetails.slice(0, 4).map(m => `${m.mechanismOfAction} -> ${m.targetName}`)
  const diseases = context.rich.diseaseAssociations.slice(0, 6).map(d => d.diseaseName).filter(Boolean)
  const indications = context.rich.indicationDetails.slice(0, 5).map(i => i.condition).filter(Boolean)
  const genes = context.rich.geneDetails.slice(0, 6).map(g => g.symbol).filter(Boolean)
  const pathways = context.rich.pathwayNames.slice(0, 5).map(p => p.name).filter(Boolean)

  const user = `Suggest 3-5 entities a researcher should explore next, given they've just looked at ${context.identity.name}. Each suggestion must be one of: a related molecule, a target gene, or a related disease.

CURRENT MOLECULE CONTEXT:
- Name: ${context.identity.name}
- Top targets: ${targets.join(', ') || '(none)'}
- Mechanisms: ${mechanisms.join('; ') || '(none)'}
- Disease associations: ${diseases.join(', ') || '(none)'}
- Current indications: ${indications.join(', ') || '(none)'}
- Key genes in pathways: ${genes.join(', ') || '(none)'}
- Pathways: ${pathways.join(', ') || '(none)'}

OUTPUT REQUIREMENTS — STRICT:
You MUST return ONLY a fenced JSON code block. No preamble, no explanation, no text before or after the fence. The shape is an array of 3-5 objects, each with EXACTLY these fields:
- "type": one of "molecule", "gene", or "disease"
- "name": a short string naming the entity (gene symbol, disease name, or drug name)
- "reason": a single sentence (max 25 words) explaining WHY this entity is worth looking at next

Example of valid output (do NOT copy verbatim — generate suggestions for ${context.identity.name}):
\`\`\`json
[
  {"type": "gene", "name": "EGFR", "reason": "Top binding target above; explore EGFR-driven indications beyond current ones."},
  {"type": "molecule", "name": "Gefitinib", "reason": "Same EGFR mechanism — useful resistance/selectivity comparison."},
  {"type": "disease", "name": "Non-small cell lung cancer", "reason": "Shared target landscape and unmet need for combination therapies."}
]
\`\`\`

Generate the JSON now. Output ONLY the fenced JSON block — nothing else.`

  return { system: SYSTEM_PROMPT, user }
}

/**
 * Hypothesis seed: takes a free-form research question and proposes a
 * structured Filter[] for plan 01's hypothesis builder.
 */
export function buildHypothesisSeedPrompt(context: MoleculeContext, researchQuestion: string): { system: string; user: string } {
  const targets = context.rich.topTargetActivities.slice(0, 5).map(t => t.targetName).filter(Boolean)
  const indications = context.rich.indicationDetails.slice(0, 5).map(i => i.condition).filter(Boolean)
  const atc = context.rich.atcClasses.slice(0, 4).filter(Boolean)
  const phases = Object.entries(context.clinical.phaseBreakdown).map(([k, v]) => `${k}=${v}`).join(', ')

  const user = `A researcher asked: "${researchQuestion}"

Context — current molecule: ${context.identity.name}
- Top targets (gene symbols if available): ${targets.join(', ') || '(none)'}
- Current indications: ${indications.join(', ') || '(none)'}
- ATC classes: ${atc.join(', ') || '(none)'}
- Trial phases on file: ${phases || '(none)'}

Translate the researcher's question into 2-3 filters for the BioIntel Hypothesis Builder. The builder intersects molecules that match ALL filters.

The ONLY valid filter axes are:
- "targets_gene"   — value is a gene symbol (e.g. "EGFR", "BRCA1")
- "indicated_for"  — value is a disease name (e.g. "melanoma", "asthma")
- "trial_phase"    — value is one of "1", "2", "3", or "4"
- "atc_class"      — value is an ATC code (e.g. "L01", "N02BA")

OUTPUT REQUIREMENTS — STRICT:
You MUST return ONLY a fenced JSON code block. The shape is an array of 2-3 objects, each with EXACTLY these fields:
- "axis":  one of "targets_gene", "indicated_for", "trial_phase", "atc_class"
- "value": a non-empty string appropriate for that axis

Example of valid output (do NOT copy verbatim — generate filters for the question above):
\`\`\`json
[
  {"axis": "targets_gene", "value": "EGFR"},
  {"axis": "trial_phase", "value": "3"}
]
\`\`\`

Generate the JSON filters now. Output ONLY the fenced JSON block.`

  return { system: SYSTEM_PROMPT, user }
}
