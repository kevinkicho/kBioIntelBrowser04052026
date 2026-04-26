# 06 — AI Tasks Beyond Summarization

## Why

The Ollama integration currently does one thing well: **summarize one entity at a time**. The same local model can do **structured tasks** that compound the value of the data already on the page:

- Drafting prior-art queries for patent searches
- Generating differential safety profiles between two drugs
- Suggesting next entities to explore based on what the user just looked at
- Seeding a hypothesis (plan #01) from a free-form research question

None of these require new infrastructure — Ollama is already wired through `useAI`, `AICopilot`, `contextBuilder`, and `promptTemplates`. The work is **adding new prompt modes and small post-processors**, not new plumbing.

## Scope (v1)

Four new prompt modes added to the AI copilot:

1. **Prior-art query generator** — for a molecule, generate a Boolean query suitable for USPTO / Google Patents / EuropePMC
2. **Differential safety profile** — given two molecules, draft a paragraph contrasting their adverse-event profiles using `mergedData` from each
3. **Suggest next entities** — given the current entity, suggest 3–5 related molecules / genes / diseases to explore, each with a one-line reason
4. **Hypothesis seed** — given a free-form research question typed in the copilot, generate the filter combination plan #01's hypothesis builder would need

**Out of scope for v1:** multi-turn agentic flows, tool use (function calling), fine-tuning, model-specific optimizations.

## Approach

Each mode is a new `PromptTemplate` in `src/lib/ai/promptTemplates.ts`. The existing `contextBuilder.ts` already produces a structured context blob; add a `buildContext(entity, mode)` overload that includes only the data each mode needs (keeps context small for 7B models).

Each mode also gets a small **post-processor** that validates the output structure (regex / JSON parse) so a hallucinating model doesn't poison downstream UI.

Reuse:
- `useAI.tsx` — provider, model selection, streaming
- `AICopilot.tsx` — UI shell, mode dropdown
- `contextBuilder.ts` — structured context generation

## Mode-by-mode

### Prior-art query

Input: molecule data (name, synonyms, target proteins, mechanism). Output: a single Boolean query string with synonyms OR'd, target name AND'd, and clinical context optionally OR'd. Validator: parses to a balanced parenthesized expression with no unmatched quotes.

### Differential safety profile

Input: two `mergedData` blobs side-by-side. Output: 3–5 short paragraphs covering: shared adverse events, divergent risks, severity comparison, regulatory status differences. Validator: paragraph count and presence of both molecule names.

### Suggest next entities

Input: current entity + its top-N linked entities (from `panelSources` and graph data). Output: 3–5 entity refs with type + name + 1-line reason. Validator: each ref resolves to a known entity type and the names look plausible (no obviously hallucinated names by checking against synonyms or letting the user confirm).

### Hypothesis seed

Input: a research question in natural language. Output: a structured `Filter[]` matching plan #01's filter schema. Validator: each filter has a known entity type and attribute; user reviews before executing.

## File-level changes

- `src/lib/ai/promptTemplates.ts` — 4 new mode templates
- `src/lib/ai/contextBuilder.ts` — overloads for the new modes
- `src/components/ai/AICopilot.tsx` — UI for selecting modes + a "second molecule" picker for differential safety
- `src/lib/ai/aiTasks/priorArt.ts` — pure post-processor + validator
- `src/lib/ai/aiTasks/diffSafety.ts` — pure post-processor
- `src/lib/ai/aiTasks/suggestNext.ts` — pure post-processor
- `src/lib/ai/aiTasks/hypothesisSeed.ts` — pure post-processor (depends on plan #01's `Filter` schema)
- New tests: at minimum one happy-path + one malformed-output test per mode (~20 tests total)

## Risks & open questions

- **Hallucinations.** 7B models invent citation counts and trial IDs. Strict prompt template + post-validation against the actual data keeps this in check; "suggest next" is the riskiest because the entity universe is large
- **Differential safety needs both molecules' data simultaneously.** Adds a "second molecule picker" UI to the copilot. Cohort comparison (plan #03) builds on the same picker — coordinate
- **Context window.** 7B models cap around 8k tokens. For the largest molecules (aspirin, metformin) the merged data exceeds this; the context builder must summarize/truncate intelligently
- **No ground truth for "suggest next."** A user feedback loop ("was this helpful?") would help over time but is out of scope for v1

## Effort

**~4 days.**

| Day | Work |
|-----|------|
| 1   | Prompt templates + context builder overloads + UI mode dropdown |
| 2   | Prior-art mode end-to-end + validator + tests |
| 3   | Differential safety + second-molecule picker + tests |
| 4   | Suggest-next + hypothesis-seed + polish + edge cases |

## Acceptance

- All 4 modes appear in the copilot dropdown for the relevant entity types
- Each generates output in <30 s on the default Ollama model (gemma3:4b or similar)
- Output passes its structural validator on the happy path
- Validator handles malformed model output gracefully (falls back to "AI response was unclear" rather than crashing)
- "Differential safety" picker reuses the cohort/compare picker if plan #03 has shipped
- Hypothesis-seed mode can hand off to plan #01's `/hypothesis` page if both have shipped
