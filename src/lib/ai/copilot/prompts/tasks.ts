import type { MoleculeContext } from '@/lib/ai/copilot/context'
import type { SessionMoleculeSummary } from './types'
import { SYSTEM_PROMPT } from './shared'
import {
  buildDiffSafetyPack,
  buildPriorArtEvidencePack,
} from '@/lib/ai/copilot/evidencePack'

// PLAN 06: AI tasks beyond summarization — structured output validated by post-processors
// Prefer deterministic artifacts in useAICopilot when bags allow; these prompts are LLM fallback.

export function buildPriorArtQueryPrompt(context: MoleculeContext): { system: string; user: string } {
  const system = `You are a patent-search query generator. Your ONLY job is to return a Boolean query string. You output NOTHING ELSE — no preamble, no explanation, no markdown, no code fence, no quotes around the whole result. Just the raw query on a single line. Use ONLY names present in the evidence pack — never invent targets.`

  const user = `Generate a Boolean prior-art query for "${context.identity.name}" using ONLY terms from this pack:

${buildPriorArtEvidencePack(context)}

STRICT:
- Single line Boolean query
- Double quotes around multi-word terms
- OR synonyms; AND targets/MoA when present in pack
- MUST contain "${context.identity.name}"
- No markdown/preamble

Example shape (do not copy):
("aspirin" OR "acetylsalicylic acid") AND ("cyclooxygenase" OR "COX-1") AND (therapy OR treatment)`

  return { system, user }
}

/**
 * Differential safety profile between current molecule and one previously-viewed
 * molecule. Output is 3-5 short paragraphs.
 */
export function buildDifferentialSafetyPrompt(
  context: MoleculeContext,
  other: SessionMoleculeSummary,
): { system: string; user: string } {
  const user = `Write a differential safety profile contrasting two drugs using ONLY the pack. Both names MUST appear.

${buildDiffSafetyPack(context, other)}

Produce 3-5 short paragraphs separated by blank lines:
1. SHARED AEs (name them from the pack)
2. DIVERGENT risks (name them)
3. Severity using report counts only — not incidence
4. Boxed warning / recalls if present

Rules: name AEs explicitly; FAERS = reports not rates; no invented MoA.`

  return { system: SYSTEM_PROMPT, user }
}

/**
 * Suggest 3-5 next entities to explore. Output is a JSON code block.
 * Prefer deterministicNext when bags have named rows.
 */
export function buildSuggestNextPrompt(context: MoleculeContext): { system: string; user: string } {
  const targets = context.rich.topTargetActivities.slice(0, 8).map((t) => t.targetName).filter(Boolean)
  const mechanisms = context.rich.mechanismDetails
    .slice(0, 6)
    .map((m) => `${m.mechanismOfAction} -> ${m.targetName}`)
  const diseases = context.rich.diseaseAssociations.slice(0, 8).map((d) => d.diseaseName).filter(Boolean)
  const indications = context.rich.indicationDetails.slice(0, 6).map((i) => i.condition).filter(Boolean)
  const genes = context.rich.geneDetails.slice(0, 6).map((g) => g.symbol).filter(Boolean)
  const pathways = context.rich.pathwayNames.slice(0, 6).map((p) => p.name).filter(Boolean)

  const user = `Suggest 3-5 entities a researcher should explore next after ${context.identity.name}.
ONLY suggest names that appear in the lists below (or clear gene symbols from target names). Do not invent drugs.

LOADED NAMES ONLY:
- Targets: ${targets.join(', ') || '(none)'}
- Mechanisms: ${mechanisms.join('; ') || '(none)'}
- Diseases: ${diseases.join(', ') || '(none)'}
- Indications: ${indications.join(', ') || '(none)'}
- Genes: ${genes.join(', ') || '(none)'}
- Pathways: ${pathways.join(', ') || '(none)'}

OUTPUT: ONLY a fenced JSON array of 3-5 objects with fields type ("molecule"|"gene"|"disease"), name, reason (max 25 words).`

  return { system: SYSTEM_PROMPT, user }
}

export function buildHypothesisSeedPrompt(
  context: MoleculeContext,
  researchQuestion: string,
): { system: string; user: string } {
  const targets = context.rich.topTargetActivities.slice(0, 5).map((t) => t.targetName).filter(Boolean)
  const indications = context.rich.indicationDetails.slice(0, 5).map((i) => i.condition).filter(Boolean)
  const atc = context.rich.atcClasses.slice(0, 4).filter(Boolean)
  const phases = Object.entries(context.clinical.phaseBreakdown)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')

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

Prefer values that appear in the context lists when the question is vague.

OUTPUT REQUIREMENTS — STRICT:
You MUST return ONLY a fenced JSON code block. The shape is an array of 2-3 objects, each with EXACTLY these fields:
- "axis":  one of "targets_gene", "indicated_for", "trial_phase", "atc_class"
- "value": a non-empty string appropriate for that axis

Generate the JSON filters now. Output ONLY the fenced JSON block.`

  return { system: SYSTEM_PROMPT, user }
}
