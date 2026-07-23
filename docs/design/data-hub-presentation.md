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

## Surfaces (v1)

| Entity | Builder | UI mount |
|--------|---------|---------|
| Molecule | `buildMoleculeDataHub` | profile after summary |
| Gene | `buildGeneDataHub` | gene detail (loaded) |
| Disease | `buildDiseaseDataHub` | disease detail header |
| Org / lab | `buildOrgDataHub` | research lab dossier |

## Export

- CSV (UTF-8 BOM) and TSV from ledger header buttons
- `dataHubToDelimited` / `dataHubExportFilename` in `src/lib/dataHub/exportDataHub.ts`
- Columns: section, fact, value, source, sourceUrl, panelId, categoryId, domain, detail

## Source directory

- `buildSourceDirectory(ledger)` → per-source fact counts + docs links
- UI: `SourceDirectoryPanel` under each full-density Data hub
- Filter: hide empty sources (toggle)

## Cross-DB identity keys (molecule)

When category bags fill: ChEMBL, ChEBI, DrugBank xref, RxCUI, ATC, UNII/GSRS, UniChem/MyChem counts — each with provenance and deep links where policy-safe.

## Research capabilities (P0–P1)

| Capability | Code | Notes |
|------------|------|-------|
| Deep lit/grant/trial/structure rows | `buildMoleculeDataHub` | Titles, years, DOI/PMID, PI, institute, NCT title, PDB, UniProt |
| Research kit export | `downloadResearchKit` | Multi-file: hub CSV, sources.json, claims.md, README, manifest |
| Research view (molecule) | `ResearchFocusView` + ViewToggle `research` | Dense tables; default for casual browse |
| Research tab (gene) | `gene-research` panel | Drugs · diseases · variants · pathways samples |
| Discover mini hub | `buildDiscoverMiniHub` + `DiscoverMiniHub` | Gather facts on shortlist cards; no rank mutation |

### Research kit files

```
biointel-research-kit-{slug}-{id}-data-hub.csv
biointel-research-kit-{slug}-{id}-sources.json
biointel-research-kit-{slug}-{id}-claims.md   # when claims present
biointel-research-kit-{slug}-{id}-README.md
biointel-research-kit-{slug}-{id}-manifest.json
```

## Compare side-by-side hub (P2)

| Piece | Path |
|-------|------|
| Builder | `buildCompareHubMatrix` / `compareBagsFromMoleculeData` |
| UI | `CompareDataHubMatrix` on `/compare` when ≥2 CIDs load |
| Export | CSV/TSV of fact × molecule matrix |

## Methodology page (P2)

Public citable page: **`/methodology`** (“How we present data”) — of-record layers, honesty rules, exports, product law. Linked from header (**Data methods**), homepage, how-it-works, compare footer.
