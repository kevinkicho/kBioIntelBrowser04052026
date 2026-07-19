# AI module map (post-refactor)

**Product law:** free public APIs; claim-/evidence-bound AI; no LLM in Discover of-record rank. Optional dual-view analysis is non-of-record (`docs/design/ai-analysis-view.md`).

## Surfaces

| Surface | Path | Style |
|---------|------|--------|
| **Profile Copilot** | `components/ai/AICopilot.tsx` + `components/ai/copilot/*` | Open tools + profile context |
| **Discover AI analysis** | `components/discover/AiAnalysisView.tsx` + `lib/ai/aiRank/*` | Opt-in reorder; validated keys |
| **Board AI recommend** | `components/projects/BoardAiRecommend.tsx` | Non-of-record triage order |
| **Disease Intelligence** | `components/disease/DiseaseIntelligencePanel.tsx` | Claim-bound disease prompts; user-triggered |
| **Pack AI** | `components/evidence/PackAiPanel.tsx` + `lib/ai/contracts.ts` | Structured JSON over pack claims |
| **RH AI** | `components/evidence/RhAiPanel.tsx` + `lib/ai/rhContracts.ts` | Structured JSON over hypothesis claims |

Do **not** merge Pack/RH prompt systems into Copilot tools. Share only runtime helpers.

## Layout

```text
src/lib/ai/
  useAI.tsx                 # Ollama Cloud provider
  runtime/
    streamChat.ts           # extractStreamError, collectStream
    agentLoop.ts            # pure tool loop
  aiRank/                   # dual-view of-record vs analysis
  copilot/
    types.ts
    tools/                  # allowlisted agent tools (Phase A+B)
    retrieval/              # Monitor world-model (snapshot)
    prompts/                # domain-split: types, shared, molecule, disease, gene, discover, tasks
    context/                # domain-split: types, helpers, molecule, disease, gene
    resolveInsightPrompt.ts # pure mode → prompt selection
    validateTaskMode.ts     # plan-06 task validators
  contracts.ts / rhContracts.ts
  aiTasks/                  # task validators (prior art, etc.)

src/hooks/useAICopilot.ts   # composes snapshot + insights + agentic ask
src/components/ai/copilot/  # MonitorTab, InsightsTab, AskTab, Settings, bubbles
```

## Compatibility shims

- `@/lib/ai/promptTemplates` → `copilot/prompts`
- `@/lib/ai/contextBuilder` → `copilot/context`
- `@/lib/ai/retrievalMonitor` → `copilot/retrieval`
- `@/lib/ai/copilotTools` → `copilot/tools`

Prefer new paths in new code; shims stay until call sites migrate.

## Agent tools (Copilot Ask only)

Allowlisted in `copilot/tools/catalog.ts`. Max steps: `COPILOT_MAX_TOOL_STEPS`.

Phase A: retrieval snapshot, panel summary, load/retry category, session molecules, suggest next.  
Phase B: `open_panel`, `fix_gap`, `get_pack_claims`, `seed_research_hypothesis`, `compare_board`.

No Discover of-record ranking tools.

## Prompt transparency + cloud history

| Piece | Path |
|-------|------|
| Reveal system/user prompts | `components/ai/AiPromptReveal.tsx` |
| Paginated restore of prior gens | `components/ai/AiGenerationHistory.tsx` |
| Persist (signed-in only) | `lib/firebase/aiDataSync.ts` — includes `promptSystem` / `promptUser`, `listAiGeneratedPage` |

Kinds: `copilot` · `pack` · `disease` · `rh` · `discover_rank` · `board_recommend`

### Regenerate modal (at surface)

`components/ai/AiRegenerateModal.tsx` — review/override prompt, paginated prior gens, **Load message**, **Regenerate with this prompt**.

### Unified store

- `lib/ai/aiHistoryStore.ts` — `persistAiGeneration` (IDB always + Firestore when signed in)
- `lib/ai/aiHistoryIdb.ts` — local IndexedDB
- Global browse: `/ai-history`
