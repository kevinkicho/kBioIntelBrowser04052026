# AI module map (post-refactor)

**Product law:** free public APIs; claim-/evidence-bound AI; no LLM in Discover rank.

## Surfaces

| Surface | Path | Style |
|---------|------|--------|
| **Profile Copilot** | `components/ai/AICopilot.tsx` + `components/ai/copilot/*` | Open tools + profile context |
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
  copilot/
    types.ts
    tools/                  # allowlisted agent tools
    retrieval/              # Monitor world-model (snapshot)
    prompts/                # prompt catalog (via prompts/all + index)
    context/                # context builders (via context/all + index)
  contracts.ts / rhContracts.ts
  aiTasks/                  # task validators

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
No Discover ranking tools.
