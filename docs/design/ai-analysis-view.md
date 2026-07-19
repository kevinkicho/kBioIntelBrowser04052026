# AI analysis view (Discover / board) — design note

**Status:** Shipped (Discover toggle + board recommend + export dual attach + events)  
**Product law:** Free public APIs only; deterministic **of-record** rank; optional AI analysis is non-of-record

## Dual plane

| Plane | Source of truth | AI? |
|-------|-----------------|-----|
| Of-record | Deterministic multi-axis shortlist | Never in path |
| Analysis | User-connected model (Ollama) | Opt-in reorder / recommend + reasons |

## Contracts

- AI may only reorder candidates already in the shortlist (no invented molecules)
- Reasons should cite evidence keys (trials, targets, AE, sources)
- UI banner: **Analysis view · not of-record**
- Events: `ai_rank_view_toggled`, `ai_rank_completed`, `ai_recommend_completed` (never replace `discover_rank_completed`)
- User is responsible for verification; not regulatory decision support

## Modules

- `src/lib/ai/aiRank/` — context, prompt, parse, validate
- `src/components/discover/AiAnalysisView.tsx` — Discover UI
- Board: `src/components/projects/BoardAiRecommend.tsx`

## Export

When AI analysis ran, export helpers may attach `aiAnalysis` (ordering, caveats, model) alongside of-record `candidates[]` without replacing order.

## Copilot agent tools (Phase B)

Allowlisted in `src/lib/ai/copilot/tools/catalog.ts` — deterministic executors only:

| Tool | Purpose |
|------|---------|
| `open_panel` | Scroll profile UI to a panel |
| `fix_gap` | Retry/load for Monitor gaps (empty = no invent) |
| `get_pack_claims` | Pack index claim ids + promote evidence tags |
| `seed_research_hypothesis` | Seed RH from latest pack (local storage) |
| `compare_board` | Board statuses/scores for a project |

Board tools need `projectId` (or profile `?project=` as default). Never invent claim bodies.

## Prompt transparency + history

- **Show prompt** on Discover analysis, board recommend, Pack/RH AI, Copilot settings (`AiPromptReveal`)
- **Cloud history** (signed-in): `users/{uid}/ai/*` via `listAiGeneratedPage` + `AiGenerationHistory` with restore
- Signed-out users keep session-only outputs (product law: local default)
