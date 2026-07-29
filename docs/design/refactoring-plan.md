# Refactoring plan — status

**Updated:** 2026-07-29  
**Scope:** Maintainability + tool surfacing after reliability ship train.  
**Product law:** free public APIs; deterministic Discover rank; claim-bound AI; no dual-emit.

## Done

| Slice | Notes |
|-------|--------|
| AI shim removal | `copilot/*` only; legacy shims deleted |
| Research catalog modules | `methods/research/*` + `export:research-catalog` |
| CLI single-source suggest | JSON from TS; session flags/env/logs |
| Project board sections | Empty / pack / RH extracted |
| Copilot tool handlers | `tools/handlers.ts` + types/helpers |
| Copilot entity context | `useCopilotEntityContext` |
| DTO types split | `src/lib/types/*` domain modules |
| How-it-works Tools tab | `HowToolsTab` |
| Molecule hub sections | `moleculeHub/sections/*` |
| Analytics UI helpers | `analyticsPageUi.tsx` + `useAnalyticsDashboard` |
| Engine pure helpers | `engineHelpers.ts` (rank path frozen) |
| Pipeline README + productLaw | Shared law bullets |
| Playbook run actions + loop strip | Discover / board |
| Catalog freshness in `test:gate` | `exportResearchCatalog` + `researchToolCatalog` patterns |
| Kit-diff teaser on Research view | Links methodology |
| Cheap-phase honesty banner | Discover |
| Non-of-record AI copy | Discover AI analysis + board AI |
| Request metrics M7 count | Local funnel rank completes |
| E2E research tools surface | `e2e/research-tools-surface.spec.ts` |

## Deferred / freeze

| Item | Why |
|------|-----|
| `scoreAxes` / densify score semantics rewrite | Of-record freeze zone |
| Auto-apply AI board statuses | Product law — user confirm only |
| Paid APIs / multi-tenant board | Forbidden |

## Agent commands

```text
npm run export:research-catalog
npm run biointel -- tools suggest --goal discover --q "NSCLC" --targets EGFR
npm run biointel -- tools suggest --goal pack --project <id>
npm run test:gate
```

## Do not reintroduce

- LLM in Discover of-record rank  
- Dual-emit product event *names*  
- Full 15-panel pack density  
- AI shims at `@/lib/ai/retrievalMonitor` etc.
