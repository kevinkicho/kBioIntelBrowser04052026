# International free public APIs (regulators & research infra)

**Status:** Active — Health Canada DPD integrated; WHO GHO + NIH RePORTER documented/scaffolded  
**Product law:** Free public APIs only; evidence-first; no regulatory decision support language  
**Audience:** Implementers adding panels without paid DBs

## Fit tiers

| Tier | Meaning |
|------|---------|
| **A** | Documented HTTP JSON/OData API, no commercial key as product requirement |
| **B** | Official bulk downloads / dumps (cache); not always live query API |
| **C** | Public portal — prefer deep links over scrape |

## Wave 1 (in app or scaffolding)

| Source | Role | Tier | Code / docs |
|--------|------|------|-------------|
| **Health Canada DPD** | FDA twin — DIN, brand, status, ingredients | A | `src/lib/api/healthCanadaDpd.ts`, panel `health-canada` |
| **NIH RePORTER** | NSF-like grants (US) | A | Already: `src/lib/api/nihreporter.ts`, panel `nih-reporter` |
| **WHO GHO OData** | CDC-like disease burden (not drug labels) | A | `src/lib/api/whoGho.ts` (scaffold) |
| **Open Targets GraphQL** | Target–disease–drug | A | Existing `opentargets.ts` |
| **ClinicalTrials.gov v2** | Trials | A | Existing `clinicaltrials.ts` |
| **openFDA / NDC / Orange Book** | US regulator | A | Existing pharmaceutical panels |

## Wave 2 (planned)

| Source | Role | Tier | Integration note |
|--------|------|------|------------------|
| **EMA** | EU authorizations | A/B | Bulk Excel/JSON + ePI API; deep links |
| **EU CTR / CTIS** | EU trials | B/C | Deep link by EU CT number |
| **ECHA CHEM** | EU chemical hazard (EPA-ish) | B/C | Deep link by CAS/EC; no full free REST bulk |
| **OpenAIRE / CORDIS** | EU funding | A/B | Project/grant context |

## Wave 3 (portal-first)

| Source | Role | Tier |
|--------|------|------|
| MHRA products / Yellow Card | UK SPC / AE | C |
| TGA ARTG | Australia register | C |
| PMDA / JADER | Japan | C / B bulk |

## Product rules

- New sources **enrich panels / claims / deep links** — never invent clinical efficacy.
- Do not put LLM or flaky scrapers in the Discover rank path.
- Prefer documented REST/OData/GraphQL; cache with `revalidate` (e.g. 24h).
- Empty free-API responses are honest empties (`epistemicStatus` / empty panels).

## Health Canada DPD (reference)

- Base: `https://health-products.canada.ca/api/drug/`
- Key endpoints: `drugproduct`, `activeingredient`, `form`, `route`, `status`, `schedule`
- Docs: https://health-products.canada.ca/api/documentation/dpd-documentation-en.html
- Licence: Open Government Licence — Canada

## WHO GHO (reference)

- Base: `https://ghoapi.azureedge.net/api/`
- No auth. Indicators via OData filters.
- Docs: https://www.who.int/data/gho/info/gho-odata-api
- Use for **disease epidemiology context**, not molecule labels.

## NIH RePORTER (reference)

- `POST https://api.reporter.nih.gov/v2/projects/search`
- Free; already wired for molecule name search grants panel.

## Do not

- Scrape ARTG / MHRA / adrreports.eu as primary product path
- Require paid commercial regulatory DBs
- Phrase panels as “approved to treat” clinical advice
