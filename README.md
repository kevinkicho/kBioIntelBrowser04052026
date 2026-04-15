# BioIntel Explorer

A public open-science web portal that aggregates molecular, pharmaceutical, clinical, regulatory, and structural biology data from **110+ free public APIs** into a unified molecule profile page with **100+ data panels** across **9 categories**.

Search any molecule by name, CAS, SMILES, InChIKey, CID, formula, or InChI — with per-API identifier overrides and parameter controls — then browse by category, compare side-by-side, or explore relationships through an interactive network graph.

## Built With Claude Code

This project was designed and engineered almost entirely by [Claude Code](https://claude.ai/claude-code) (Anthropic's AI coding agent), working in collaboration with a bioengineering domain expert who provided the scientific vision, feature direction, and quality review. Claude Code authored the architecture, all API integrations, UI components, test suite, and documentation — from initial scaffold through 110+ data source integrations across multiple iterative development cycles.

## Data Sources (110+ Free Public APIs)

### NIH High-Impact (5 APIs)
| Source | What It Provides |
|--------|-----------------|
| NCI Cancer Data Standards (caDSR) | Cancer data standards, terminology, and metadata |
| NCATS Translator | Biomedical knowledge graph for drug-disease-gene associations |
| NHGRI AnVIL | Genomic and clinical data from large-scale studies |
| NIAID ImmPort | Immunology data, clinical studies, and reagents |
| NINDS NeuroMMSig | Neurological disease mechanisms and signatures |

### Pharmaceutical (11 APIs)
| Source | What It Provides |
|--------|-----------------|
| openFDA Drugs | Manufacturer/brand data, product types, administration routes |
| FDA Orange Book | Patent exclusivity, therapeutic equivalence codes, approval history |
| RxNorm | Drug interaction data via NLM |
| DailyMed | FDA-approved drug labeling and package inserts |
| WHO ATC | Anatomical Therapeutic Chemical classification |
| FDA NDC Directory | National Drug Code packaging, dosage forms, marketing status |
| CMS NADAC | National Average Drug Acquisition Cost — pharmacy pricing |
| DrugCentral | Drug indications, targets, FAERS adverse events, ATC codes |
| PharmGKB | Pharmacogenomics data and drug-gene associations |
| CPIC | Clinical pharmacogenetics implementation guidelines |
| GSRS (UNII) | Unique ingredient identifiers |

### Clinical & Safety (11 APIs)
| Source | What It Provides |
|--------|-----------------|
| ClinicalTrials.gov | Active clinical trials, phases, sponsors, conditions |
| ISRCTN | UK clinical trial registry |
| openFDA Adverse Events | Reported adverse drug reactions and serious event counts |
| FDA Drug Recalls | Safety recalls with severity classification |
| ChEMBL Indications | Approved and investigational therapeutic indications |
| ClinVar | Clinically significant genetic variants |
| GWAS Catalog | Genome-wide association study results with p-values |
| EPA ToxCast | High-throughput toxicity assay results |
| SIDER | Side effect frequency data |
| EPA IRIS | Toxicological assessments |
| FDA Drug Shortages | Current and resolved drug shortage reports |

### Molecular & Chemical (15 APIs)
| Source | What It Provides |
|--------|-----------------|
| PubChem Properties | Computed properties (LogP, TPSA, complexity) |
| PubChem Hazards | GHS hazard classifications, pictograms |
| ChEBI | Chemical ontology — biological roles |
| EPA CompTox | Chemical descriptors, exposure predictions |
| KEGG | Metabolic reaction pathways |
| Rhea | Biochemical reaction data |
| Metabolomics Workbench | Metabolite data |
| MyChem.info | Chemical annotations aggregator |
| HMDB | Human metabolome database |
| MassBank | Mass spectrometry data (MassBank3 API) |
| MetaboLights | Metabolomics repository |
| GNPS | Mass spectrometry networking |
| LIPID MAPS | Comprehensive lipid classification |
| UniChem | Cross-references between chemical databases |
| FooDB | Food compound database |

### Bioactivity & Targets (12 APIs)
| Source | What It Provides |
|--------|-----------------|
| ChEMBL | Bioactivity data (IC50, Ki, assay results) |
| PubChem BioAssay | Screening results with activity outcomes |
| ChEMBL Mechanisms | Mechanism of action data |
| IUPHAR/GtoP | Ligand-target interactions with affinity |
| BindingDB | Quantitative binding affinity measurements |
| Pharos (TCRD) | Target development level classification |
| DGIdb v5 | Drug-gene interactions (GraphQL API) |
| Open Targets | Disease associations |
| CTD | Chemical-gene-disease interactions |
| IEDB | Immune epitope database |
| LINCS L1000 | Perturbation signatures from Connectivity Map |
| TTD | Therapeutic target database |

### Protein & Structure (15 APIs)
| Source | What It Provides |
|--------|-----------------|
| UniProt | Protein targets with functional descriptions |
| InterPro | Protein domain and family annotations |
| EBI Proteins API | Protein features — variants, active sites, binding sites |
| Human Protein Atlas | Tissue and subcellular localization |
| QuickGO | Gene Ontology annotations (EBI) |
| RCSB PDB | 3D crystal structures |
| PDBe Ligands | Small molecule ligand properties |
| AlphaFold DB | AI-predicted protein structures |
| PeptideAtlas | Proteomics data |
| PRIDE | Proteomics repository |
| CATH/Gene3D | Protein domain classification |
| SAbDab | Antibody structure database |

### Genomics & Disease (19 APIs)
| Source | What It Provides |
|--------|-----------------|
| NCBI Gene | Gene summaries, genomic location |
| Ensembl | Genomic coordinates, biotype classification |
| Expression Atlas | Gene expression across tissues |
| GTEx | Tissue-specific gene expression |
| GEO | Gene Expression Omnibus datasets |
| dbSNP | Genetic variant database |
| ClinGen | Clinical genomics resource |
| MedGen | Medical genetics concepts |
| Monarch Initiative | Disease-gene-phenotype associations |
| NCI Thesaurus | Cancer drug/concept definitions |
| MeSH | Standardized medical terminology |
| DisGeNET | Gene-disease associations |
| Orphanet | Rare disease data |
| MyGene.info | Gene annotation aggregator |
| Bgee | Gene expression patterns |
| OMIM | Genetic disorder database |
| HPO | Human Phenotype Ontology |
| OLS | Ontology Lookup Service |
| CTD Diseases | Disease associations from CTD |

### Interactions & Pathways (10 APIs)
| Source | What It Provides |
|--------|-----------------|
| STRING | Protein-protein interaction networks |
| STITCH | Chemical-protein interactions |
| IntAct | Experimentally validated interactions |
| Reactome | Biological pathway participation |
| WikiPathways | Community-curated pathways |
| Pathway Commons | Aggregated pathway data |
| BioCyc | Metabolic pathway database |
| SMPDB | Small molecule pathway database |
| KEGG | Metabolic and signaling pathways, compounds, drugs |

### Research & Literature (10 APIs)
| Source | What It Provides |
|--------|-----------------|
| NIH RePORTER | Active NIH-funded research grants |
| USPTO PatentsView | Patent filings with assignee search |
| SEC EDGAR | 10-K filings from pharmaceutical companies |
| Europe PMC | Peer-reviewed literature |
| PubMed/NCBI | Research articles with abstracts |
| Semantic Scholar | AI-powered paper search with TLDRs |
| OpenAlex | Scholarly works with citation impact |
| OpenCitations | Citation network metrics |
| CrossRef | DOI metadata and citations |
| arXiv | Preprint server |

## Features

### Advanced Search System
- **7 Identifier Types** — Search by Name, CID, CAS, SMILES, InChIKey, InChI, or Formula
- **Per-API Identifier Overrides** — Each of the 80+ APIs can be configured to use a different identifier type (e.g., search ChEMBL by SMILES, UniProt by gene symbol, PDB by InChIKey)
- **Per-API Parameters** — Configure maxResults, filters (clinical trial status, assay type, p-value thresholds, confidence scores), and toggles per API
- **API Health Checks** — Click any API name to see description, data fields, organization, docs link, endpoint URL, and live health check with latency
- **Dense Table Layout** — All 80+ APIs visible at once with no-wrap rows, category filter pills, and text filter
- **Navigation Guard** — Page dims and blocks all clicks during navigation to prevent double-submits

### Core
- **Molecule Profile Page** — 100+ panel dashboard aggregating data from 85+ APIs
- **Horizontal Category Tab Bar** — Sticky top navigation with data availability indicators
- **Full-Width Content** — No sidebar; content uses the entire viewport width
- **Lazy Category Loading** — Categories load on-demand (pharmaceutical first, others pre-fetch in background)
- **Virtual Scrolling** — Large datasets (>20 items) use virtual scrolling for smooth performance
- **AI Research Summarizer** — Plain-English intelligence briefs from 60+ data points
- **BioIntel Copilot** — AI sidebar with data retrieval monitor, auto insights, gap analysis, and free-form Q&A (100% local via Ollama)
- **Shareable URLs** — Active tab, view mode, and per-API overrides synced to URL for deep linking
- **Error Boundaries** — Individual panel isolation prevents cascading failures
- **Request Deduplication** — In-flight API requests are shared across components

### Source Transparency
- **Panel Source Footer** — Every data card shows the source organization, API name, documentation link, endpoint URL, and "Fetch JSON" button
- **API Metadata Registry** — 80+ APIs cataloged with organization, description, docs URL, and endpoint

### Visualization
- **Interactive Network Graph** — D3.js force-directed graph showing molecule relationships
- **3D Protein Structure Viewer** — 3Dmol.js viewer with multiple render modes
- **Interactive Charts** — Clinical trials, adverse events, bioactivity, publications

### Tools
- **Drug-Drug Interaction Checker** — Cross-reference 2-8 drugs with severity color-coding
- **Batch Molecule Lookup** — Compare 3-10 molecules side by side
- **Molecule Comparison** — Two-molecule deep comparison across 20+ dimensions

### Data
- **PDF Export** — Executive summary with structure, metrics, AI brief
- **Favorites** — Bookmark system with favorites bar
- **Data Freshness Indicators** — Time since last fetch for each panel
- **Server-Side Caching** — LRU cache (200 entries, 24hr TTL)
- **Hide Empty Panels** — Toggle defaults to hiding panels with no data
- **API Analytics Dashboard** — `/analytics` page with per-source success rate, latency trends, error tracking, and empty-data detection

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS (dark-mode-first)
- **AI Engine:** Ollama (local LLM) for summarization and copilot
- **Charts:** Recharts
- **Visualization:** D3.js, 3Dmol.js
- **Virtualization:** @tanstack/react-virtual
- **Testing:** Jest + React Testing Library

## Getting Started

```bash
npm install
npm run dev
```

App runs on **http://localhost:52167** by default (configurable via `PORT` env var).

### Optional Environment Variables

```env
OPENFDA_API_KEY=your_key_here          # Increases openFDA rate limits
NCBI_EMAIL=your_email_here             # NCBI Entrez (required)
NCBI_API_KEY=your_key_here             # NCBI API key (increases rate limits)
OMIM_API_KEY=your_key_here             # OMIM genetic disorder data
```

## Project Structure

```
src/
  app/
    page.tsx                     # Home page with advanced search
    browse/                      # Category browsing
    compare/                     # Side-by-side comparison
    batch/                       # Batch lookup (3-10 molecules)
    interactions/                # Drug interaction checker
    molecule/[id]/               # Profile page (server + client)
    api/                         # API routes
  lib/
    api/                         # 85+ API client modules
    apiIdentifiers.ts            # Per-API identifier configs & parameter definitions
    resolveApiQuery.ts           # Identifier resolution (name/CID/CAS/SMILES/InChIKey/InChI/formula)
    panelSources.ts              # Panel→source metadata mapping
    clientFetch.ts               # Browser fetch wrapper with logging & dedup
    fetchCategory.ts             # Category data fetcher with override forwarding
    lazyPanels.tsx               # Dynamic imports for 100+ panels
    types.ts                     # TypeScript interfaces
    categoryConfig.ts            # Panel/category configuration
    analytics/api-meta.ts        # API metadata registry (org, docs, endpoint)
  components/
    search/                      # AdvancedSearchPanel, SearchBar
    profile/                     # 100+ data panel components
    charts/                      # Recharts visualizations
    graph/                       # D3.js network graph
    ui/                          # Shared primitives (Panel with source footer, Card, Table)
  __tests__/                     # Test suites
```

## Recent Changes

### v0.4.0 (2026-04-14)

- **BioIntel Copilot:** AI-powered sidebar with real-time data retrieval monitoring, auto-generated insights (executive brief, safety deep dive, gap analysis), and free-form Q&A — all processed locally via Ollama
- **Unified AI Provider:** Single persistent `AIProvider` at root layout survives page navigations; connection state, model selection, and config persist across the entire app
- **AI Connection Resilience:** Config restore/save race condition fixed — localStorage no longer overwritten with defaults before restore; auto-reconnect with exponential backoff (up to 20 retries)
- **API Proxy Improvements:** `/api/ai/show` returns `{ available: false }` (HTTP 200) instead of forwarding Ollama error status codes, eliminating spurious 404 console errors
- **Cleaner Console Logging:** Model info logs suppressed when all fields are null; no redundant noise on models that don't support `/api/show`
- **Dev Server Fix:** Eliminated Node DEP0190 deprecation warning for `shell: true` with args in `scripts/dev.js`

### v0.3.0 (2026-04-13)

- **Advanced Search System:** 7 identifier types (Name, CID, CAS, SMILES, InChIKey, InChI, Formula) with per-API overrides and parameter controls for 80+ APIs
- **Per-API Settings Pipeline:** Full end-to-end wiring — overrides/params flow from homepage URL params through ProfilePageClient → fetchCategoryData → category route → individual API functions
- **Dense API Settings Table:** Replaced collapsible category tree with flat no-wrap table showing all 80+ APIs at once; category filter pills and text filter for quick navigation
- **API Detail Drawer:** Click any API name for description, data fields, organization, docs link, endpoint URL, and live health check with latency
- **Navigation Guard:** Page dims and blocks all clicks during navigation to prevent double-submits across all interactive elements
- **Source Footer on Panels:** Every data card shows source organization, API name, docs link, and endpoint URL
- **Horizontal Category Tab Bar:** Replaced sidebar with sticky top navigation
- **Identifier Resolution:** `resolveApiQuery.ts` utility resolves correct identifier per API from molecule data (CID, name, CAS, SMILES, InChIKey, InChI, formula)
- **API Fixes:** LINCS (single signature query), MassBank (timeout/size limits), ChEMBL (timeout override), ATC (response parsing), ToxCast/IRIS/CompTox (search fallback), IUPHAR (fuzzy search), BindingDB (URL), DGIdb (v5 GraphQL), ChemSpider (PubChem rewrite), MeSH (UI URLs), Gene Ontology (EBI QuickGO), PDB (parallel fetch, number resolution), GWAS Catalog (trait→EFO→associations with p-values)
- **HTML Stripping:** Shared `stripHtml()` utility applied to Reactome, SMPDB, OMIM, MeSH, HMDB, ChEBI, IUPHAR
- **Per-API Params:** `getChemblMechanismsByName`, `getClinVarVariantsByName`, `searchPubMed`, `getProteinInteractionsByName` (STRING) now accept limit/score parameters

### v0.2.0 (2026-04-11)

- **Bug Fix:** NIH High-Impact category panels incorrectly showed "5/5" data count when all panels had no data. Fixed by returning `null` on failure and rewriting `hasRealData()` with recursive check.
- **Dev server:** Fixed `rimraf` dependency error and switched to Node built-in `fs.rmSync`
- **Dev server:** Fixed `serverExternalPackages` config warning

## License

Open source for educational and research purposes.

---

*Engineered by [Claude Code](https://claude.ai/claude-code) in collaboration with Kevin Kicho.*