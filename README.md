# BioIntel Explorer

A public open-science web portal that aggregates molecular, pharmaceutical, clinical, regulatory, and structural biology data from **85+ free public APIs** into a unified molecule profile page with **75+ data panels** across **9 categories**.

Search any molecule by name, browse by category, compare side-by-side, or explore relationships through an interactive network graph.

## Built With Claude Code

This project was designed and engineered almost entirely by [Claude Code](https://claude.ai/claude-code) (Anthropic's AI coding agent), working in collaboration with a bioengineering domain expert who provided the scientific vision, feature direction, and quality review. Claude Code authored the architecture, all API integrations, UI components, test suite, and documentation — from initial scaffold through 89+ data source integrations across multiple iterative development cycles.

## Data Sources (85+ Free Public APIs)

### NIH High-Impact (5 APIs)
| Source | What It Provides |
|--------|-----------------|
| NCI Cancer Data Standards (caDSR) | Cancer data standards, terminology, and metadata |
| NCATS Translator | Biomedical knowledge graph for drug-disease-gene associations |
| NHGRI AnVIL | Genomic and clinical data from large-scale studies |
| NIAID ImmPort | Immunology data, clinical studies, and reagents |
| NINDS NeuroMMSig | Neurological disease mechanisms and signatures |

### Pharmaceutical (9 APIs)
| Source | What It Provides |
|--------|-----------------|
| openFDA Drugs | Manufacturer/brand data, product types, administration routes |
| FDA Orange Book | Patent exclusivity, therapeutic equivalence codes, approval history |
| RxNorm | Drug interaction data via NLM |
| DailyMed | FDA-approved drug labeling and package inserts |
| WHO ATC | Anatomical Therapeutic Chemical classification |
| FDA NDC Directory | National Drug Code packaging, dosage forms, marketing status |
| CMS NADAC | National Average Drug Acquisition Cost — pharmacy pricing |
| DrugCentral | Drug indications, FAERS adverse events |
| PharmGKB | Pharmacogenomics data and drug-gene associations |
| CPIC | Clinical pharmacogenetics implementation guidelines |
| GSRS (UNII) | Unique ingredient identifiers |
| ChemSpider | Chemical structure database |

### Clinical & Safety (10 APIs)
| Source | What It Provides |
|--------|-----------------|
| ClinicalTrials.gov | Active clinical trials, phases, sponsors, conditions |
| ISRCTN | UK clinical trial registry |
| openFDA Adverse Events | Reported adverse drug reactions and serious event counts |
| FDA Drug Recalls | Safety recalls with severity classification |
| ChEMBL Indications | Approved and investigational therapeutic indications |
| ClinVar | Clinically significant genetic variants |
| GWAS Catalog | Genome-wide association study results |
| EPA ToxCast | High-throughput toxicity assay results |
| SIDER | Side effect frequency data |
| EPA IRIS | Toxicological assessments |

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
| BioCyc | Metabolic pathway database |
| SMPDB | Small molecule pathway database |
| FooDB | Food compound database |

### Bioactivity & Targets (10 APIs)
| Source | What It Provides |
|--------|-----------------|
| ChEMBL | Bioactivity data (IC50, Ki, assay results) |
| PubChem BioAssay | Screening results with activity outcomes |
| ChEMBL Mechanisms | Mechanism of action data |
| IUPHAR/GtoP | Ligand-target interactions with affinity |
| BindingDB | Quantitative binding affinity measurements |
| Pharos (TCRD) | Target development level classification |
| DGIdb | Drug-gene interactions |
| Open Targets | Disease associations |
| CTD | Chemical-gene-disease interactions |
| IEDB | Immune epitope database |

### Protein & Structure (12 APIs)
| Source | What It Provides |
|--------|-----------------|
| UniProt | Protein targets with functional descriptions |
| InterPro | Protein domain and family annotations |
| EBI Proteins | Protein features — active sites, binding sites |
| Human Protein Atlas | Tissue and subcellular localization |
| QuickGO | Gene Ontology annotations |
| RCSB PDB | 3D crystal structures |
| PDBe Ligands | Small molecule ligand properties |
| AlphaFold DB | AI-predicted protein structures |
| PeptideAtlas | Proteomics data |
| PRIDE | Proteomics repository |
| CATH/Gene3D | Protein domain classification |
| SAbDab | Antibody structure database |

### Genomics & Disease (15 APIs)
| Source | What It Provides |
|--------|-----------------|
| NCBI Gene | Gene summaries, genomic location |
| Ensembl | Genomic coordinates, biotype classification |
| Expression Atlas | Gene expression across tissues |
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

### Interactions & Pathways (10 APIs)
| Source | What It Provides |
|--------|-----------------|
| STRING | Protein-protein interaction networks |
| STITCH | Chemical-protein interactions |
| IntAct | Experimentally validated interactions |
| Reactome | Biological pathway participation |
| WikiPathways | Community-curated pathways |
| Pathway Commons | Aggregated pathway data |
| CTD Disease | Disease associations from CTD |
| KEGG Pathways | Metabolic and signaling pathways |

### Research & Literature (9 APIs)
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

### Core
- **Molecule Profile Page** — 75+ panel dashboard aggregating data from 85+ APIs
- **Collapsible Sidebar Navigation** — 9 category tabs with data availability indicators
- **Lazy Category Loading** — Categories load on-demand (pharmaceutical first, others pre-fetch in background)
- **Virtual Scrolling** — Large datasets (>20 items) use virtual scrolling for smooth performance
- **AI Research Summarizer** — Plain-English intelligence briefs from 60+ data points
- **Shareable URLs** — Active tab and view mode synced to URL for deep linking
- **Error Boundaries** — Individual panel isolation prevents cascading failures
- **Request Deduplication** — In-flight API requests are shared across components
- **Browser Console Logging** — Styled request/response/error logging for easier debugging

### Visualization
- **Interactive Network Graph** — D3.js force-directed graph showing molecule relationships
- **3D Protein Structure Viewer** — 3Dmol.js viewer with multiple render modes
- **Interactive Charts** — Clinical trials, adverse events, bioactivity, publications
- **Pathway Diagrams** — Inline pathway previews from Reactome and WikiPathways

### Tools
- **Drug-Drug Interaction Checker** — Cross-reference 2-8 drugs with severity color-coding
- **Batch Molecule Lookup** — Compare 3-10 molecules side by side
- **Molecule Comparison** — Two-molecule deep comparison across 20+ dimensions
- **Similar Molecules** — PubChem structural similarity suggestions

### Data
- **PDF Export** — Executive summary with structure, metrics, AI brief
- **Favorites** — Bookmark system with favorites bar
- **Data Freshness Indicators** — Time since last fetch for each panel
- **Server-Side Caching** — LRU cache (200 entries, 24hr TTL)
- **Consistent Empty States** — All panels show "No data found" instead of vanishing
- **Hide Empty Panels** — Toggle defaults to hiding panels with no data; auto-loads idle categories when toggled on
- **API Analytics Dashboard** — `/analytics` page with per-source success rate, latency trends, error tracking, and empty-data detection (SQLite-backed, zero-cost)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS (dark-mode-first)
- **AI Engine:** Ollama (qwen3.5) for summarization
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
OMIM_API_KEY=your_key_here             # OMIM genetic disorder data
NCI_CADSR_API_KEY=your_key_here        # NCI Cancer Data Standards Registry (caDSR)
NCATS_TRANSLATOR_API_KEY=your_key_here # NCATS Biomedical Translator
NHGRI_ANVIL_API_KEY=your_key_here      # NHGRI AnVIL
NIAID_IMMPORT_API_KEY=your_key_here     # NIAID ImmPort
NINDS_NEUROMMSIG_API_KEY=your_key_here  # NINDS NeuroMMSig
```

## Project Structure

```
src/
  app/
    page.tsx                     # Home page with search
    browse/                      # Category browsing
    compare/                     # Side-by-side comparison
    batch/                       # Batch lookup (3-10 molecules)
    interactions/                # Drug interaction checker
    molecule/[id]/               # Profile page (server + client)
    api/                         # 85+ API routes
  lib/
    api/                         # 85 API client modules
    clientFetch.ts               # Browser fetch wrapper with logging & dedup
    lazyPanels.tsx               # Dynamic imports for 75+ panels
    types.ts                     # TypeScript interfaces
    categoryConfig.ts            # Panel/category configuration
  components/
    profile/                     # 75+ data panel components
    charts/                      # Recharts visualizations
    graph/                       # D3.js network graph
    ui/                          # Shared primitives (Panel, Card, Table, etc.)
  __tests__/                     # Test suites
```

## Recent Changes

### v0.2.0 (2026-04-11)

- **Bug Fix:** NIH High-Impact category panels (NCI caDSR, NCATS Translator, NHGRI AnVIL, NIAID ImmPort, NINDS NeuroMMSig) incorrectly showed "5/5" data count even when all panels had no data. The API clients returned wrapper objects (e.g., `{ data: { concepts: [] }, source: '...', timestamp: '' }`) on failure, which the category data counter treated as non-null objects with data. Fixed by:
  - Changing `safe()` fallbacks in `fetchNihHighImpact()` from wrapper objects to `null`
  - Updating panel renderers to safely unwrap `null` and wrapper-object responses
  - Rewriting `getCategoryDataCounts()` with a recursive `hasRealData()` helper that looks inside `{ data: ... }` wrappers to check for actually populated arrays/objects
- **Dev server:** Fixed `rimraf` dependency error and switched to Node built-in `fs.rmSync`; changed default port to `0` (OS-assigned)
- **Dev server:** Fixed `serverExternalPackages` config warning (moved to `experimental.serverComponentsExternalPackages` for Next.js 14)

## License

Open source for educational and research purposes.

---

*Engineered by [Claude Code](https://claude.ai/claude-code) in collaboration with Kevin Kicho.*