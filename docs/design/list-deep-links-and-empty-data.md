# List deep links, empty-data opacity, and gene multi-cards

Operational rules for BioIntel Discovery Workbench UI so agents and implementers do not reintroduce homepage SPA shells or “looks loaded but empty” cards.

## 1. Deep-link policy

**Rule:** Every list-row / chip **View →** must open a **source record**, not a database homepage or client-only SPA shell.

| Do | Don’t |
|----|--------|
| ChEMBL `/explore/compound/CHEMBL25` | `/chembl/g/#search…` or bare `/chembl/` |
| DGIdb `/genes/hgnc:5743` or `/results?searchType=gene&searchTerms=` | `/genes/PTGS2` (symbol-only) |
| UniChem → target DB (PubChem, DrugBank, …) | `/unichem/#/search/…` |
| WHO ATC `atcddd.fhi.no/atc_ddd_index/?code=` | Homepage-only with no code |
| MyChem `/v1/chem/{InChIKey}` | Free-text only with no IDs |

**Code:**

- `src/lib/deepLinkPolicy.ts` — `isBrokenSourceShellUrl`, `preferStableDeepLink`
- Source builders: `chemblLinks.ts`, `api/dgidb.ts`, `api/unichem.ts`, `api/atc.ts`, `api/mychem.ts`
- Click analytics (optional, non-blocking): `src/lib/trackDeepLink.ts` → product event `source_deep_link_opened` (M6)

**Client recovery:** If stored `url` is a broken shell, rebuild from IDs before rendering the href.

**Soft-refresh / cache bust:** Category soft-refresh already sends `refresh=1` (server skips process cache) and now also `_t={timestamp}` so browser caches cannot serve stale payloads (`src/lib/fetchCategory.ts`). Full profile refresh uses `?refresh=1` and clears client IDB/L1.

## 2. Empty-data opacity

**Rule:** Zero / null / `—` / blank metrics are quieter than real data (`opacity-20`).

| Scope | Behavior |
|-------|----------|
| Summary main cards | Whole card dimmed if primary + all secondaries empty; individual zero metrics dimmed when card has other data |
| Profile `Panel` | Dimmed when `empty` prop is set and there are no children |
| Discover source status strip | Bucket chips with count `0` dimmed |

**Code:** `src/lib/summaryEmpty.ts` — `isEmptyMetric`, `summaryCardHasData`, `panelHasData`, `emptyDataClass`.

Do **not** invent fake zeros as real signal (e.g. ToxCast “0.0% active” when counts are unavailable).

## 3. Gene tabs: one API → one card

Multi-source gene tabs must **not** merge unrelated APIs into a single card body.

| Tab | Separate cards |
|-----|----------------|
| Expression | GTEx · Bgee · Expression Atlas |
| Pathways | Reactome · WikiPathways · Gene Ontology |
| Variants | ClinVar · dbSNP · ClinGen dosage |
| Diseases | DisGeNET · GWAS Catalog · ClinGen |

Glance counts may still **sum** sources; the list UI stays split.

## 4. Table-style listviews

Dense catalogs use aligned columns: **primary · key metrics · Open ↗**. Prefer whole-row deep links.

Examples: ATC, UniChem, MyChem, DGIdb, ChEMBL bioactivity/indications/mechanisms, BindingDB, ClinicalTrials, AdverseEvents, Open Targets, STRING, STITCH, Patents, Competitive Landscape, gene Targeted Drugs.

## 5. Identity-first fetch (when free APIs allow)

Prefer resolve-by-id then annotate:

1. CID / InChIKey / CHEBI:id / HMDB id / DrugBank id / DTXSID / RxCUI  
2. Fielded search (`chembl.pref_name:…`, OLS exact label)  
3. Free-text last; filter package-only / wrong-entity rows  

Implemented more strongly for: MyChem, UniChem, ATC, IRIS, CompTox identity, ChEBI, HMDB, DrugCentral.

## 6. Do not

- Add paid CompTox/CTX keys as product requirements  
- Dual-emit legacy product event *name* aliases without a design revision  
- Free-form Discover ranking AI  
- Regulatory decision support language  

## 7. Cross-source representation (entity strips)

**Problem:** Most panels show **one** free API in the card body (gene §3). Analysis needs multiple sources side-by-side without muddying provenance.

**Rule:** Entity-centric **cross-source strips** may join many free public sources for the same molecule / gene / disease / org / candidate. Each fact/chip keeps:

- `source` (human label)
- optional `sourceUrl` (policy-safe deep link)
- optional `panelId` + `categoryId` (scroll to siloed full table)

| Layer | Behavior |
|-------|----------|
| **List / panel body** | Still **one API → one card** (gene §3 unchanged) |
| **Cross-source strip** | Multi-source chips/facts from already-fetched DTO bags |
| **Claims / packs** | Multi-extractor merge with per-claim `provenance.source` |

**Code:**

- Contract: `src/lib/crossSource/*` (`CrossSourceFact`, `CrossSourceBundle`, builders)
- UI: `src/components/crossSource/CrossSourceStrip.tsx`
- Surfaces: molecule profile, Discover `CandidateCard`, gene glance, disease page, research-lab dossier, DecisionStrip claim histogram

**Do not:** merge unrelated API **tables** into one scroll body; invent clinical conclusions; change of-record Discover scores.

## Related tests

- `__tests__/lib/deepLinkPolicy.test.ts`
- `__tests__/lib/summaryEmpty.test.ts`
- `__tests__/lib/trackDeepLink.test.ts` / `source_deep_link_opened` in productEvents tests
- Panel tests for table columns + non-homepage hrefs
- `src/lib/crossSource/__tests__/crossSource.test.ts`

## Soft-refresh / cache bust (operators)

1. Soft card refresh: client sends `refresh=1&_t={ms}` → server skips process cache; client skips L1/IDB read.
2. Full profile refresh: navigate with `?refresh=1` (also clears client profile cache).
3. After deploy, users with long-lived tabs should hard-refresh once or open a category “Refresh this card” so deep links rebuild from new code.
