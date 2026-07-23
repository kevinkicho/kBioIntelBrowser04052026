# Data hub — factual multi-source presentation

**Status:** shipped (v0) on molecule profile  
**Product law:** Free public APIs only; evidence-first; no regulatory decision support; no LLM in of-record rank path.

## Goal

Present **accurate, source-attributed facts** from many free public databases as a **data hub**, not as narrative AI or unattributed dashboards.

## Layers (do not collapse)

| Layer | Role | Of-record? |
|-------|------|------------|
| **Data hub ledger** | Fact · Value · Source · Open table from retrieved DTOs | Yes (presentation of retrieved records) |
| **Source coverage strip** | Count chips per free API | Yes (coverage, not conclusions) |
| **Siloed panels** | One API → one card/table (gene §3 / list-deep-links) | Yes |
| **Claims / packs** | Extractors with `provenance.source` | Yes when claim-bound |
| **Derived assistive** | Charts, next-steps, research digests, optional AI | **No** — labeled non-of-record |

## Code

- Contract: `src/lib/dataHub/*` (`DataHubRow`, `buildMoleculeDataHub`)
- UI: `src/components/dataHub/DataHubLedger.tsx`
- Wire: `src/app/molecule/[id]/ProfilePageClient.tsx` (above derived block)
- Related: `src/lib/crossSource/*`, `docs/design/list-deep-links-and-empty-data.md`

## Rules

1. Never invent values — empty shows `—` and can be hidden.
2. Every non-empty row names a **source**; deep links must pass `deepLinkPolicy`.
3. Counts/samples are **session-loaded** samples, not universe claims (state in detail notes).
4. FAERS / spontaneous reports are not incidence rates (explicit detail).
5. Do not auto-apply AI reorder to Discover of-record scores.

## Next (optional)

- Gene / disease / org data hub builders (parity with molecule)
- Export data hub as CSV / TSV for lab notebooks
- Source directory page filtered by coverage on current entity
