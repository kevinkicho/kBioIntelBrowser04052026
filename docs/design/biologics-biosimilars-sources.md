# Biologics & biosimilars — free public data map

**Status:** Active — panel-enrichment path (not a biologics-first entity model)  
**Product law:** Free public APIs only · evidence-first · no clinical / regulatory decision support language  
**Identity note:** Discover still ranks primarily on PubChem / small-molecule-friendly IDs. Biologics appear as **profile enrichment** (BLA family, labels, trials, structure DBs) without rewriting the identity graph (see discovery-workbench non-goals).

## What users asked for vs free-data reality

| Need | Free public source strength | In BioIntel |
|------|----------------------------|-------------|
| **Market-approved biologics in circulation** | Strong (US) | openFDA Drugs@FDA **BLA** rows → panel `biologics-licensed` |
| **Biosimilars vs reference** | Medium | Heuristic US 4-letter suffix + BLA family; official roles on **Purple Book** portal/download |
| **Certifications / approvals** | Strong (US/EU portals) | BLA + Drugs@FDA docs; EMA/OT `drugType` + EPAR deep links; Health Canada DPD |
| **Corporations / sponsors** | Strong | BLA `sponsor_name`; openFDA labels / NDC `labeler_name`; Companies panel |
| **Manufacturing plants** | Weak–medium (portal) | FDA Data Dashboard / establishment search deep links by sponsor (not a full plant graph API) |
| **Recipes / CMC process** | **Very weak / proprietary** | **Do not invent.** Label / DailyMed composition only; full manufacturing recipes are not free public product data |
| **Trading statistics (molecule-level)** | Weak free | No free molecule-SKU trade API. Use portal deep links (UN Comtrade, USITC DataWeb) — aggregate HS codes, not INN-level |
| **Antibody structure** | Medium | Existing **SAbDab** experimental panel |
| **EU biosimilars** | Medium | EMA medicines panel + EMA biosimilar topic + bulk Excel (tier B) |

## Tier table (free only)

| Source | Role | Tier | Notes |
|--------|------|------|-------|
| **openFDA Drugs@FDA** | BLA applications, sponsors, products, marketing status | A | `application_number:BLA*` — live JSON |
| **FDA Purple Book** | Licensed biologics, biosimilar / interchangeable flags | B/C | Search portal + monthly downloads; **no free stable REST** for interchangeability fields |
| **openFDA NDC / labels** | Labeler, package, product type | A | Already in NDC + Companies |
| **Orange Book (openFDA)** | Small-molecule TE / patents | A | **Not** for biologics (NDA/ANDA) |
| **Open Targets GraphQL** | `drugType` (Antibody, Protein, …), trade names, approval year | A | Already `ema-medicines` |
| **EMA bulk Excel / JSON dumps** | Authorised medicines tables | B | `emaBulk.ts` deep links; overnight updates |
| **EMA biosimilars topic** | EU biosimilar framing + EPAR entry | C | Portal |
| **Health Canada DPD** | Canadian marketed products | A | Existing panel |
| **GSRS / UNII** | Substance identity | A | Existing |
| **SAbDab** | Antibody structures | A/C | Existing experimental |
| **ClinicalTrials.gov** | Development pipeline | A | Existing |
| **FDA establishment / FEI dashboard** | Inspected facilities | C | Deep link by sponsor name |
| **UN Comtrade / USITC** | Trade flows by HS code | C | Portal only; not INN-resolved |
| **DailyMed** | Label text, composition sections | A | Existing — not full CMC recipes |

## Honest gaps (do not promise)

1. **Recipes / batch manufacturing process** — trade secret / CMC; not available as free structured product APIs.  
2. **Plant → BLA certified graph** — partial via FEI/inspection portals; not a clean free join to every product.  
3. **Global sales / unit volume by brand** — commercial DBs (IQVIA, etc.) — **out of product law**.  
4. **Interchangeability determination as structured API** — Purple Book download/portal; do not scrape HTML as primary path.  
5. **First-class biologics identity in Discover rank** — deferred (different identity graph); panels only.

## Implementation map

| Code | Purpose |
|------|---------|
| `src/lib/api/biologicsLicensed.ts` | openFDA BLA family fetch + role heuristics |
| `src/components/profile/BiologicsLicensedPanel.tsx` | Profile UI |
| `src/lib/api/emaBulk.ts` | EMA bulk / biosimilar portal links |
| `docs/design/public-apis-international.md` | International regulators (EMA, MHRA, …) |

## Language rules

- Prefer: “FDA-licensed BLA record”, “openFDA lists”, “heuristic biosimilar suffix”, “see Purple Book for interchangeability”.  
- Avoid: “approved to treat”, “interchangeable with X” as app assertions, “this biosimilar is safe”.

## Wave 4 (shipped) — tier B caches + polish

| Source | Role | Code |
|--------|------|------|
| **Purple Book monthly CSV** | Official 351(a) / 351(k) biosimilar / interchangeable | `purpleBookCache.ts`, panel `purple-book`, `GET /api/purple-book?q=` |
| **EMA medicines Excel** | Official biosimilar / orphan / ATMP flags + MAH | `emaMedicinesBulk.ts` + zero-dep xlsx reader, panel `ema-bulk`, `GET /api/ema-bulk?q=` |
| **Open Targets drugType** | Antibody / Protein / Small molecule badge | EMA medicines panel + molecule summary “Drug type” |
| **SEC 10-K/10-Q by sponsor** | Corporate filings deep link | Biologics + Purple Book panels |

### Cache notes

- Purple Book: try current month → older months (14 candidates); Next `revalidate` 7d + process memory catalog.
- EMA Excel: single stable URL; Next `revalidate` 24h + process memory catalog.
- Parsers: hand-rolled CSV + OOXML (no paid/xlsx SaaS deps).

## Wave 5 (shipped) — BPPT patents + establishment portals

| Source | Role | Code |
|--------|------|------|
| **Purple Book patent list (BPPT)** | Sponsor-submitted patents + expiry for certain reference BLAs | `purpleBookPatents.ts`, panel `purple-book-patents`, `GET /api/purple-book-patents?q=` |
| **Establishment / FEI / DRLS portals** | Manufacturing plant discovery (portal-first) | `establishmentDeepLinks.ts`, panel `establishment-links` |
| **Patent list provided flag** | From monthly Purple Book CSV | Badge on Purple Book product rows |

### Honest limits (unchanged)

- BPPT is **ministerial** FDA publication — not validity/infringement analysis.  
- No free BLA→FEI plant graph; DRLS + Data Dashboard + FEI portal only.  
- Discover biologics-first identity graph remains a design non-goal until revised.

## Still optional later

- Server-side FEI plant join if a free structured public FEI API appears without auth.  
- Discover biologics-first identity graph (design non-goal until revised).  
- Cache USPTO bulk patent assignments (separate free dump; large).
