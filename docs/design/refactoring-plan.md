# Refactoring plan — BioIntel Discovery Workbench

Canonical copy of the approved maintainability plan (session plan 2026-07-28).

**Shipped / in progress:**

| PR | Status |
|----|--------|
| PR1 AI shim kill-switch | Done — shims deleted; imports use `copilot/*` |
| PR2 Catalog module path | Done — `src/lib/methods/research/catalog.ts` + stable re-export |
| PR3 CLI single-source | Done — `export:research-catalog` + thin CLI suggestCommands |
| PR4 Project page extract | Pending |
| PR5 Copilot modularization | Pending |
| PR6 Pipeline/law hygiene | Pending |

See full PR detail in the agent plan file or continue from AGENTS.md notes.

**Commands:**

```text
npm run export:research-catalog   # regenerate researchPlaybooks.json from TS
npm run biointel -- tools suggest --goal evidence --cid 2244
```

**Do not:** rewrite Discover `engine.ts` rank math; dual-emit product events; merge Pack AI into Copilot tools.
