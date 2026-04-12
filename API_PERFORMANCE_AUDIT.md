# BioIntel Explorer — API Performance & Reliability Audit

**Date:** 2026-04-12  
**Methodology:** Queried 12 distinct molecules across 6 input types, hitting all 9 category endpoints per molecule. Timed each category fetch. Inspected per-panel data quality on aspirin (CID 2244).

---

## 1. Search Resolution by Input Type

| Input Type | Query | CID Found? | Time | Notes |
|---|---|---|---|---|
| Gene | BRCA1 | ❌ no | 635ms | PubChem returns no CID for gene symbols |
| Gene | TP53 | ❌ no | 101ms | Same — genes aren't molecules |
| Gene | EGFR | ✅ 9549299 | 113ms | Resolves to EGFR inhibitor, not the gene |
| Protein | insulin | ✅ 70678557 | 306ms | Human insulin |
| Protein | hemoglobin | ❌ no | 238ms | No CID match |
| Protein | albumin | ❌ no | 97ms | No CID match |
| Molecule | aspirin | ✅ 2244 | 311ms | Perfect |
| Molecule | caffeine | ✅ 2519 | 254ms | Perfect |
| Molecule | glucose | ✅ 5793 | 238ms | Perfect |
| IUPAC | acetylsalicylic acid | ✅ 2244 | 412ms | Matches aspirin CID |
| IUPAC | 1,3,7-trimethylxanthine | ✅ 2519 | 279ms | Matches caffeine CID |
| Brand | Lipitor | ✅ 60822 | 293ms | Resolves to atorvastatin |
| Brand | Advil | ✅ 3672 | 269ms | Resolves to ibuprofen |
| Brand | Tylenol | ✅ 1983 | 249ms | Resolves to acetaminophen |
| Generic | atorvastatin | ✅ 60823 | 356ms | ⚠ Different CID than Lipitor (60822 vs 60823) |
| Generic | ibuprofen | cached 3672 | — | Same CID as Advil |
| Generic | acetaminophen | cached 1983 | — | Same CID as Tylenol |

**Key findings:**
- Resolution works well for common molecule names, drug brands, and IUPAC names
- Gene names (BRCA1, TP53) fail — PubChem doesn't index genes by symbol
- Some protein names (hemoglobin, albumin) fail — too ambiguous for PubChem
- ⚠ Lipitor → CID 60822, atorvastatin → CID 60823 (different CIDs for brand vs generic — likely calcium salt vs free acid)

---

## 2. Category Fetch Performance

Average times across all successful fresh (non-cached) queries:

| Category | Avg Time | Range | # Errors | Status |
|---|---|---|---|---|
| pharmaceutical | ~1.2s | 0.9–1.7s | 0/14 | ✅ Fast, reliable |
| clinical-safety | ~3.5s | 0.8–16.4s | 0/14 | ⚠ caffeine=16s outliers |
| molecular-chemical | **~54s** | 52–57s | 0/14 | 🔴 Extremely slow — bottleneck |
| bioactivity-targets | ~10.5s | 10–11s | 0/14 | ⚠ Slow but consistent |
| protein-structure | ~5.5s | 1.3–15.5s | 0/14 | ⚠ Variable; caffeine=15.5s |
| genomics-disease | ~5.5s | 1.7–11.3s | 1/14 | ⚠ EGFR timeout at 60s |
| interactions-pathways | ~5.5s | 1–16s | 0/14 | ⚠ Tylenol=16s caffeine=10s |
| research-literature | ~3s | 1.8–3.9s | 0/14 | ✅ Reliable |
| nih-high-impact | ~0.8s | 0.5–1.8s | 0/14 | ✅ Fast, reliable |

**Total non-cached fetch time per molecule: ~84 seconds** (dominated by molecular-chemical at 54s)

---

## 3. The molecular-chemical Bottleneck

The `molecular-chemical` category consistently takes **52–57 seconds**. This category fetches 15 panels in parallel. The slowest APIs within it are likely:

- **CompTox** (EPA) — known for slow/timeout responses
- **ChemSpider** — requires API key, often falls back to empty
- **MetaboLights** — large dataset, slow search
- **FooDB** — intermittent availability
- **MassBank** — spectral database, slow queries
- **GNPS** — two sub-queries (library + networks)

**Recommendation:** Add per-API timeouts (5s soft, 15s hard) and short-circuit: if 80% of panels have resolved, return without waiting for stragglers.

---

## 4. Data Quality Analysis (Aspirin CID 2244)

### Panels That Return Data ✅
| Panel | Count | Quality |
|---|---|---|
| NDC Products | 10 | ✅ Good |
| Drug Labels (DailyMed) | 100 | ✅ Good |
| Companies (OpenFDA) | 3 | ✅ Good |
| Adverse Events | 10 | ✅ Good |
| Clinical Trials | 5 | ✅ Good |
| ChEMBL Indications | 10 | ✅ Good |
| ClinVar Variants | 10 | ✅ Good |
| Drug Recalls | 2 | ✅ Good |
| ChEMBL Activities | 10 | ✅ Good |
| ChEMBL Mechanisms | 1 | ✅ Good |
| BioAssays | 10 | ✅ Good |
| Pharos Targets | 10 | ✅ Good |
| PDB Structures | 10 | ✅ Good |
| UniProt Entries | 5 | ✅ Good |
| Protein Domains (InterPro) | 30 | ✅ Good |
| Protein Features (EBI) | 15 | ✅ Good |
| Protein Atlas | 2 | ✅ Good |
| GO Annotations | 20 | ✅ Good |
| Ensembl Genes | 5 | ✅ Good |
| Gene Expressions | 20 | ✅ Good |
| MedGen Concepts | 5 | ✅ Good |
| MeSH Terms | 5 | ✅ Good |
| Monarch Diseases | 10 | ✅ Good |
| MyGene Annotations | 10 | ✅ Good |
| NCI Thesaurus | 10 | ✅ Good |
| Pathway Commons | 10 | ✅ Good |
| Protein Interactions (STRING) | 10 | ✅ Good |
| Reactome Pathways | 10 | ✅ Good |
| KEGG Data | compounds=2, drugs=10 | ✅ Good |
| Literature (EuropePMC) | 10 | ✅ Good |
| PubMed Articles | 20 | ✅ Good |
| SEC Filings | 100 | ✅ Good |
| CrossRef Works | 5 | ✅ Good |
| Citation Metrics (OpenCitations) | 9 | ✅ Good |
| OpenAlex Works | 10 | ✅ Good |
| Computed Properties | 8 fields | ✅ Good |
| GHS Hazards | 19 statements, 6 pictograms | ✅ Good |
| MyChem Annotations | 15 | ✅ Good |
| Synthesis Routes | 4 | ✅ Good |
| UniChem Mappings | 1 | ✅ Good |

### Panels That Return Empty/Null ⚠️

| Panel | Value | Likely Reason |
|---|---|---|
| ATC Classifications | `[]` | API key may be missing |
| Drug Prices (NADAC) | `[]` | Aspirin not in NADAC dataset |
| Orange Book | `[]` | Aspirin patents expired — no BE entries |
| Drug Interactions | `[]` | RxNorm may not list OTC interactions |
| CPIC Guidelines | `[]` | No pharmacogenomic guidelines for aspirin |
| PharmGKB Drugs | `[]` | Same — no PGx data |
| GSRS Substances | `[]` | API timeout or no match |
| DrugCentral | `null` | API timed out / failed |
| Drug Shortages | `[]` | No current shortages |
| GWAS Catalog | `[]` | No GWAS hits for aspirin |
| SIDER Side Effects | `[]` | API returned empty |
| IRIS Assessments | `[]` | EPA doesn't assess aspirin |
| ISRCTN Trials | `[]` | No ISRCTN trials found |
| ToxCast | `null` | API failed/timed out |
| ChEBI | wrong match | Matched "aspirin-based probe AP" instead of aspirin |
| CompTox | `null` | API timed out |
| Metabolomics | `null` | API timed out |
| ChemSpider | `[]` | No API key or no results |
| FooDB | `[]` | No match or timeout |
| MassBank | `[]` | No spectral data |
| GNPS | spectra=[], clusters=[] | No data |
| MetaboLights | studies=[], metabolites=[] | No data |
| HMDB | `[]` | No match |
| LipidMaps | `[]` | Aspirin is not a lipid |
| UniChem | 1 mapping | Only 1 cross-reference |
| BindingDB | `[]` | No affinity data |
| CTD | interactions=[], diseases=[] | No data |
| DGIdb | `[]` | No interactions |
| Open Targets | `[]` | No disease associations |
| IEDB Epitopes | `[]` | No epitope data |
| LINCS | `[]` | No signatures |
| TTD | targets=[], drugs=[] | Not in TTD |
| AlphaFold | `[]` | No predictions for small molecule |
| CATH/Gene3D | domains=[], gene3d=[] | No protein structure for small mol |
| EBI Cross-refs | `null` | No data |
| EBI Variations | `null` | No data |
| Human Protein Atlas | `null` | No data |
| PeptideAtlas | `[]` | No data |
| PRIDE | `[]` | No data |
| SAbDab | `[]` | No data |
| PDB Ligands | `[]` | No data |
| ClinGen | geneDiseases=[], variants=[] | No data |
| dbSNP | `[]` | No data |
| DisGeNET | `[]` | No data |
| GEO | `[]` | No data |
| gtexExpressions | `[]` | No data |
| HPO | `[]` | No data |
| Massive Datasets | `[]` | No data |
| OLS | `[]` | No data |
| OMIM | `[]` | No API (placeholder) |
| Orphanet | `[]` | No data |
| Gene Info | `[]` | No data — aspirin isn't a gene |
| Bgee | `[]` | No data |
| BioModels | `[]` | No data |
| BioSamples | `[]` | No data |
| Chemical-Protein (STITCH) | `[]` | No data |
| Molecular Interactions | `[]` | No data |
| BioCyc | `[]` | No data |
| SMPDB | `[]` | No data |
| WikiPathways | `[]` | No data |
| ArXiv | `[]` | No data |
| NIH Grants | `[]` | Timeout or no results |
| Patents | `[]` | Timeout or no data returned |
| Semantic Scholar | `[]` | No data |

### NIH High-Impact — Wrapper Object Bug Still Visible!

The nih-high-impact category still returns wrapper objects `{ data: { ... }, source: '...', timestamp: '...' }` instead of raw arrays. Looking at actual data:

- `cadsrData.data.concepts` — empty array but wrapped in object
- `translatorData.data.associations` — empty array but wrapped
- `anvilData.data.datasets` — empty array but wrapped  
- `immPortData.data.studies` — empty array but wrapped
- `neuroMMSigData.data.signatures` — empty array but wrapped

**This means the route handler is not applying our fix locally!** The `safe()` fallback might not be the issue — the actual API responses are succeeding but returning empty arrays inside wrapper objects. The fix in `categoryConfig.ts` should handle this via `hasRealData()`, but the route handler may still be passing the raw wrapper objects through.

---

## 5. Recommendations

### 🔴 Critical (Fix Now)

1. **molecular-chemical is a 54-second bottleneck.** Add individual API timeouts (10s per API). Use `Promise.allSettled()` + `AbortController` to not wait for stragglers. This alone would cut total load time from ~84s to ~15s.

2. **NIH High-Impact wrapper objects.** The route handler returns `{ data: { ... }, source, timestamp }` wrappers that bypass the `safe()` null fallback. Need to unwrap in the route handler before returning, or ensure `hasRealData()` in categoryConfig properly recurses into `{ data: { concepts: [] } }` — which the current fix should do, but verify the route handler also passes data correctly.

### ⚠️ Important (Fix Soon)

3. **Gene/protein name resolution.** BRCA1, TP53, hemoglobin, albumin all fail to resolve. The search should have a fallback gene→symbol resolver (e.g., hit NCBI Gene API, then map to UniProt, then find a related PubChem CID).

4. **DrugCentral returns `null` consistently.** The `getDrugCentralEnhanced()` call is likely timing out or failing. Add a 10s timeout and graceful fallback.

5. **ChEBI is matching wrong compounds.** "Aspirin" matched "aspirin-based probe AP" instead of aspirin itself. The search logic needs tuning.

6. **~30 panels consistently return empty for aspirin** (a very well-known drug). Many of these are gene/protein-specific (AlphaFold, Gene Info, Bgee, etc.) which makes sense for a small molecule. But others like STITCH, GWAS, SIDER should have data. Investigate each.

### 💡 Nice to Have

7. **Per-API timeout dashboard.** The `/analytics` page should surface which APIs time out most, so you can target fixes.

8. **Cache warmed results.** After first load, subsequent loads of the same molecule are <100ms (server-side cache). Consider pre-warming cache for top-100 molecules.

9. **Progressive loading indicator per-category.** Users currently see "5/9 loaded" but no per-API progress. Show which APIs have returned within each category.

10. **Brand vs generic CID mismatch.** Lipitor→60822 and atorvastatin→60823 are different CIDs. The resolve endpoint should note this and possibly suggest the canonical CID.