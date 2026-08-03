# Production API budgets (v2.2 hardening)

**Status:** shipped on main (implementation)  
**Goal:** App Hosting must not hang multi-source fan-outs; return partial of-record shells instead.

## Rules

1. **Category wall clock** — `getCategoryTimeout()` caps at **10s** in production (`CATEGORY_WALL_MS` override). No +3s slack on the route.
2. **Leaf fetch under ALS** — when `runWithApiAbort` is active, patched `fetch` aborts each socket after **8s** (`BIOINTEL_LEAF_FETCH_MS`).
3. **Timeout → HTTP 200 partial** — molecule category + gene category return `_partial` / `_timeout` + empty sections instead of **500** or infinite hang.
4. **Identity resolve** — `getMoleculeIdentifiers` PubChem props/synonyms abort at 5s; category wraps identifiers at 6s.
5. **Research kit** — sequential categories under **18s** total wall (`RESEARCH_KIT_WALL_MS`), not 5× parallel 14s.

## Shared helpers

- `src/lib/api/timedFetch.ts` — prefer for new free-API clients
- `src/lib/api/apiAbort.ts` — ALS leaf cap
- `src/lib/utils.ts` — `getCategoryTimeout`, `isTimeoutError`

## Live health SLO

```text
BIOINTEL_BASE=https://biointel--…hosted.app
npm run api:health -- --single-fixture --timeout=25000 --ai-wire-only
```

| Tier | Target |
|------|--------|
| Leaf APIs | ≥ 80% DATA |
| Category / gene | 200 with payload (full or `_partial`) within 25s client timeout |
| Search typeahead | p95 &lt; 3s |

## Out of scope

- Paid APIs, LLM of-record ranking, multi-tenant required DB
