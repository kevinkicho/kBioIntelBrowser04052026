# Friction inventory — v2.1 manual M1 (process artifact)

**Date:** 2026-07-16  
**Scope:** Design §7.2.2 — not a product feature; captures residual human friction after hardening.

## Paths run

1. **Repurposing default:** Disease → Discover rank → promote → pack download → RH rehydrate  
2. **Rare path:** Rare persona + Orphanet boost → ATTR-like query → provenance strip + optional re-rank  

## Residual friction (post-cache / session work)

| # | Friction | Severity | Mitigation shipped / planned |
|---|----------|----------|------------------------------|
| F1 | History reopen used to re-fetch all categories | High | Profile L1/L2 revisit cache + hydrate-before-tier1 |
| F2 | PubChem stampede → false 404/502 console noise | Med | getMoleculeById de-dupe + 502 semantics + retries |
| F3 | Hard reload lost panel payloads | High | IDB L2 24h / 8 CID |
| F4 | Share API failure felt like total pack loss | Med | Share still IDB-caches; error copy; download-primary |
| F5 | M1 funnel approximate (100-event queue) | Low–Med | `sessionId` auto-attached to product events |
| F6 | Dev `layout.js` SyntaxError after Fast Refresh | Low | Wipe `.next` + clear site data (dev only) |
| F7 | First cold profile still multi-source heavy | Med | Acceptable; decision mode + tiers; not full offline |

## Do not re-open

- Multi-tenant auth as product requirement  
- 15-panel pack density  
- LLM ranking  

## Follow-ups if pain returns

- Cache pressure → compress or lower IDB TTL  
- Cross-tab stale L1 → BroadcastChannel already invalidates L1 on clear/refresh  
