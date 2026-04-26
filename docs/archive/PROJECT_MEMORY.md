# BioIntel Explorer — Project Memory

> Last updated: 2026-04-14. This file captures the full project state for future agents to pick up without losing context.

## Project Overview

BioIntel Explorer (kNIHexplorer040526) is a Next.js 14 (App Router) biomedical data explorer that aggregates 110+ free public APIs into a unified molecule profile page with 100+ data panels across 9 categories. TypeScript strict mode, Tailwind CSS dark-mode-first.

**Repo:** https://github.com/kevinkicho/kBioIntelBrowser04052026.git
**Local:** C:\Users\kevin\Desktop\kNIHexplorer040526
**Dev server:** `npm run dev` → http://localhost:52167
**Build check:** `npx next build` (ALWAYS run after changes)
**Platform:** Windows/win32, PowerShell

## User Preferences

- **Compact, information-dense UI** — minimal spacing, maximal information display
- **No emojis** in UI unless explicitly requested
- **Static content top, dynamic lists bottom** in layouts
- **Source transparency** — every data card shows org, API name, docs link, endpoint
- **Per-API tracking only** — no category-level analytics
- **Fix root causes** (dead APIs, wrong URLs, wrong parsing) over adding error handling
- **No code comments** unless asked
- **Console logging** for debugging — prefix with `[ai]`, `[ai/health]`, `[ai/pull]`, etc.
- **Privacy emphasis** — "100% local, no data leaves your machine" for AI features
- **AI Engine:** Ollama (any local LLM) for summarization and copilot

## Architecture

### Key Directories
```
src/
  app/
    page.tsx                          # Homepage
    molecule/[id]/                     # Profile page (server + client)
      page.tsx                         # Server component, fetches molecule data
      ProfilePageClient.tsx            # Client component, lazy-loads categories, renders AICopilot
    api/
      molecule/[id]/category/[categoryId]/route.ts  # Category data fetcher (MAIN ROUTE)
      search/route.ts                  # Autocomplete API
      search/resolve/route.ts          # CID resolution by type
    ai/
      health/route.ts               # Ollama health check
      pull/route.ts                  # Model pull with streaming progress
      chat/route.ts                  # Chat completions with token streaming
      show/route.ts                  # Model info (returns {available:false} on failure, never 4xx)
    analytics/page.tsx                 # Per-API analytics dashboard
  lib/
    ai/
      config.ts                        # AI state types, localStorage, model requirements
      ollama.ts                        # Ollama client (health, pull, generateChat)
      retrievalMonitor.ts             # Real-time data retrieval monitoring (gaps, anomalies, completeness)
      useAI.tsx                        # React context provider for AI state (mounted guard on save)
    api/                               # 85+ API client modules
    apiIdentifiers.ts                  # SearchType, per-API identifier configs, API parameter definitions
    resolveApiQuery.ts                 # Identifier resolution (CID/name/CAS/SMILES/InChIKey/InChI/formula)
    panelSources.ts                    # Panel→source metadata mapping
    categoryConfig.ts                  # Panel/category configuration, hasRealData()
    clientFetch.ts                     # Browser fetch wrapper with logging & dedup
    fetchCategory.ts                   # Category data fetcher with override forwarding
    utils.ts                           # stripHtml(), API_SOURCE_TIMEOUTS
    analytics/
      api-meta.ts                      # API metadata registry
      db.ts                            # JSON file-based analytics store
    types.ts                           # TypeScript interfaces
  components/
    ai/
      AIBanner.tsx                     # Splash page opt-in banner
      AIStatusIndicator.tsx            # Status dot next to title
      AICopilot.tsx                    # AI sidebar: monitor, insights, ask, settings tabs
    search/
      SearchBar.tsx                    # Search input with suggestions, type-aware
      AdvancedSearchPanel.tsx          # Dense per-API settings table, detail drawer
    profile/
      CategoryTabBar.tsx               # Horizontal sticky tab bar
      (100+ panel components)
    ui/
      Panel.tsx                        # Data card with collapsible source footer
```

### Data Flow: Search → Profile → API Calls

1. **Homepage**: User types in SearchBar, selects identifier type (Name/CID/CAS/SMILES/InChIKey/InChI/Formula)
2. **SearchBar**: Resolves via `/api/search/resolve?type=X`, navigates to `/molecule/{cid}?overrides=...&params=...`
3. **ProfilePageClient**: Reads overrides/params from URL searchParams, passes to `fetchCategoryData()`
4. **fetchCategoryData**: Forwards overrides/params as query string to category API route
5. **Category route** (`route.ts`): Parses overrides/params, calls `getMoleculeIdentifiers()` if overrides exist (fetches SMILES/CAS/InChI from PubChem), creates `queryFor(source)` function that picks correct identifier per API, passes per-API params (limit, requiredScore, etc.) to API functions
6. **Individual API functions**: Accept optional limit/filter/score parameters

### AI Integration (Phase 0+1 — Complete)

- **AIProvider** in root `layout.tsx` — single persistent instance survives page navigations
- **mounted** flag prevents hydration mismatch and localStorage overwrite race (save effect gated on `mounted === true`)
- **AIBanner**: Shows when AI not enabled; offers "Turn on AI Mode"
- **AIStatusIndicator**: Green/amber/red dot next to title
- **AICopilot**: Full sidebar (monitor, insights, ask, settings) — no own AIProvider, uses root
- **Model selection**: Excludes `:cloud`/`:api`/`:proxy` suffixes (cloud proxy models), prefers recommended models in order: gemma3:4b → qwen3.5 → gemma3:12b → gemma3:1b → llama3.2:3b → mistral:7b → phi4:14b
- **Health check**: `POST /api/ai/health` → probes Ollama `/api/tags`
- **Model pull**: `POST /api/ai/pull` → streams progress from Ollama
- **Chat**: `POST /api/ai/chat` → streams tokens from Ollama `/api/chat`
- **Model info**: `POST /api/ai/show` → returns `{available:false}` (200) on failure instead of forwarding Ollama error status
- **Config persistence**: localStorage key `biointel-ai-config` — save only after mount restore completes
- **Auto-reconnect**: Exponential backoff up to 20 retries when connection drops
- **Retrieval monitor**: Real-time data gap/anomaly detection across categories

## Completed Work

### API Fixes (Many APIs Had Broken URLs/Parsing)
- LINCS: Single signature query instead of N+1
- MassBank: Timeout/size limits, removed 10MB search fallback
- ChEMBL: Timeout overrides (25-30s)
- ATC: Fixed response parsing from `rxclassMinConceptList` → `rxclassDrugInfoList`, `classType=ATC`
- ToxCast/IRIS/CompTox: `equal` → `start-with` fallback
- IUPHAR: `?name=` → `?search=` for fuzzy matching, 2MB size limits
- BindingDB: URL `/rwd/bind/` → `/bind/`
- DGIdb: v2 → v5 GraphQL
- ChemSpider: Full rewrite to PubChem
- MeSH: `ds_meshui` URLs
- Gene Ontology: Dead `geneontology.org` → EBI QuickGO
- PDB: Parallel fetch with `Promise.all`, `resolution_combined` as number
- GWAS Catalog: Trait search → EFO → associations with real p-values
- OpenTargets: Timeout override

### HTML Stripping
- Shared `stripHtml()` in `src/lib/utils.ts` — handles `<br>` → newlines, strips tags, decodes entities
- Applied to: smpdb, reactome, omim, mesh, hmdb, chebi, iuphar

### Analytics Dashboard
- Per-API tracking only (no category-level)
- `api-meta.ts`: 80+ APIs with org, description, docs URL, endpoint
- Grouped/Table toggle, refresh button, compact detail panel

### UI Redesign
- Category sidebar → horizontal sticky topbar (CategoryTabBar)
- Full-width content (no right sidebar)
- Compact identifier row (CID, InChIKey, IUPAC name) replacing emoji header
- Panel source footer with collapsible details + Fetch JSON button

### Advanced Search System
- 7 identifier types with type-aware autocomplete
- Dense flat table (no collapsibles) for per-API settings, category filter pills, text filter
- Click API name → detail drawer (description, data fields, health check, docs link, endpoint)
- Reset button visible on collapsed toggle + inside open panel
- Navigation guard: `pointer-events-none opacity-60` on entire page during navigation

### Per-API Overrides & Parameters Pipeline
- SearchBar serializes overrides/params into URL query params
- ProfilePageClient reads from URL, passes to fetchCategoryData
- Category route resolves identifiers per API via `resolveApiQuery.ts`
- API functions now accept: limit (ChEMBL mechanisms, ClinVar, PubMed), requiredScore (STRING)

### AI Phase 0
- Ollama detection, model selection, health check, model pull with streaming, chat with token streaming
- AIBanner opt-in, AIStatusIndicator, hydration-safe rendering
- Console logging throughout with `[ai]` prefix

## In Progress / Next Steps

### AI Phase 1: AI Research Brief (Complete)
- **`src/lib/ai/buildContext.ts`** — Takes loaded category data, formats structured XML prompt chunks per panel (token budget ~4000 in, ~1500 out)
- **`src/lib/ai/promptTemplates.ts`** — System prompts, few-shot examples, per-feature templates
- **`src/lib/ai/tokenBudget.ts`** — Token counting (heuristic: chars/4 initially, upgrade to tiktoken later)
- **`src/app/api/ai/brief/route.ts`** — `POST {cid, categories[]} → streams brief`
- **`src/lib/ai/useBrief.ts`** — Hook for streaming brief state, retry, regen
- **Wire `ResearchBrief` component** (already exists at `src/components/profile/ResearchBrief.tsx`) to stream from AI
- Token budget per category: Clinical & Safety 1200, Pharmaceutical 800, Bioactivity 600, Protein 400, Genomics 400, Interactions 400, Literature 200 (titles only)
- Format panels as structured XML: `<panel id="clinical-trials"><item title="..." status="..." /></panel>`

### AI Phase 1.5: BioIntel Copilot (Complete)
- **AICopilot sidebar** with 4 tabs: Monitor, Insights, Ask, Settings
- **useAICopilot hook** — manages copilot state, auto-generates insights when 3+ categories load
- **retrievalMonitor.ts** — tracks per-category completeness, data gaps, anomalies
- **Insight modes**: executive_brief, safety_deep_dive, gap_analysis, auto_insight
- **Free-form Q&A** with suggested questions
- **Unified AIProvider** — single instance in root layout.tsx, no per-page providers

### AI Phase 2: Cross-Panel Q&A
- Floating chat FAB (bottom-right) → drawer
- Pre-seeded with molecule context from loaded categories
- Suggested questions: "What are the main safety concerns?", "Which targets does this drug interact with?"
- Keyword routing: "safety" → inject clinical-safety + pharmaceutical panels
- Chat history per-session, not persisted

### AI Phase 3: Smart Features
- Panel summaries (1-line AI summary per panel)
- Anomaly detection (compare against class averages)
- Smart search (natural language → structured queries)
- Compare page insights
- Watchlist change alerts

### AI Phase 4: Vision (Gemma 3 multimodal, gated by model capability check)
- Structure → insight from 2D structure image
- Graph interpretation screenshots
- Chart narration

### Critical API Issues Still To Fix
- **CTD**: Should use HTTPS and migrate to `ctdbase.org/api/v1/` REST API
- **SIDER**: Using STITCH proxy instead of real SIDER side effect data
- **Orphanet**: Hitting wrong endpoint (`orphacommercializedproducts` instead of disease/phenotype)
- **UniProt**: Main search doesn't filter by `reviewed:true` by default
- **BioAssay**: No limit param (returns thousands of results)
- **String/STITCH**: Missing `caller_identity` param

### Known ESLint Warnings (Non-blocking)
- `ProfilePageClient.tsx`: `useEffect` and `useMemo` missing dependencies `categoryStatus` and `loadCategory`

## Important Patterns & Conventions

- **Server-side API calls**: All external API calls happen in `src/app/api/` route handlers, never in client components
- **AI calls**: routed through `/api/ai/*` → Ollama on localhost (server-side proxy); `/api/ai/show` never returns 4xx
- **Caching**: LRU cache (200 entries, 24hr TTL) in category route, key includes overrides hash
- **Timeouts**: Per-API timeout overrides in `API_SOURCE_TIMEOUTS` (src/lib/utils.ts)
- **Empty data handling**: APIs return `null` when empty; `hasRealData()` treats `''`, `0`, empty arrays, `null` as "no data"
- **Hydration safety**: Client-only state (localStorage, AI config) must be gated behind `mounted` flag — both for rendering AND for saving (prevent defaults overwriting stored config)
- **Console logging prefix convention**: `[ai]`, `[ai/health]`, `[ai/pull]`, `[ai/chat]`, `[ai/show]`, `[ai-chat]` for AI; none for other APIs currently
- **Single AIProvider**: Always at root layout, never per-page — prevents context loss on navigation

## Environment Variables

```env
OPENFDA_API_KEY=          # Increases openFDA rate limits
NCBI_EMAIL=               # NCBI Entrez (required)
NCBI_API_KEY=             # NCBI API key (increases rate limits)
OMIM_API_KEY=             # OMIM genetic disorder data
```

### Critical Bug Fixes This Session
- **DEP0190**: `scripts/dev.js` shell:true with args → single string command
- **404 on /api/ai/show**: API route now returns `{available:false}` (200) instead of forwarding Ollama error status
- **Console noise**: Model info log suppressed when all fields null
- **Connection lost on navigation**: Removed duplicate AIProvider from page.tsx and AICopilot.tsx; single AIProvider in root layout.tsx
- **Config overwrite race**: saveAIConfig effect gated on `mounted` flag — no longer overwrites localStorage before restore

### Key Files Changed This Session

### New Files
- `src/lib/ai/config.ts` — AI config types, model requirements, findSuitableModel()
- `src/lib/ai/ollama.ts` — Ollama client: checkOllamaHealth, pullModel, generateChat
- `src/lib/ai/retrievalMonitor.ts` — Real-time retrieval completeness/gap/anomaly tracking
- `src/lib/ai/useAI.tsx` — React context provider with all AI operations
- `src/app/api/ai/health/route.ts` — Ollama health check endpoint
- `src/app/api/ai/pull/route.ts` — Model pull with streaming progress
- `src/app/api/ai/chat/route.ts` — Chat completions with token streaming
- `src/app/api/ai/show/route.ts` — Model info proxy (200 on failure)
- `src/components/ai/AIBanner.tsx` — Splash page opt-in banner
- `src/components/ai/AIStatusIndicator.tsx` — Status indicator dot
- `src/components/ai/AICopilot.tsx` — AI sidebar (monitor, insights, ask, settings)
- `src/hooks/useAICopilot.ts` — Copilot state management, auto-insight generation
- `src/lib/resolveApiQuery.ts` — Identifier resolution utility
- `src/lib/apiIdentifiers.ts` — SearchType, per-API identifier configs, parameter definitions
- `src/lib/panelSources.ts` — Panel→source metadata mapping
- `src/lib/analytics/api-meta.ts` — API metadata registry
- `src/components/search/AdvancedSearchPanel.tsx` — Dense per-API settings table
- `src/components/profile/CategoryTabBar.tsx` — Horizontal tab bar

### Modified Files (Major)
- `src/app/layout.tsx` — AIProvider wraps children (single persistent instance across pages)
- `src/app/page.tsx` — Removed local AIProvider (uses root layout's)
- `src/app/molecule/[id]/ProfilePageClient.tsx` — Reads overrides/params from URL, renders AICopilot
- `scripts/dev.js` — Fixed DEP0190: shell:true with args → single string command
- `src/lib/fetchCategory.ts` — Forwards overrides/params
- `src/app/api/molecule/[id]/category/[categoryId]/route.ts` — Parses overrides/params, queryFor(), per-API params
- `src/components/search/SearchBar.tsx` — buildSearchParams(), type-aware search, navigation with overrides
- `src/lib/api/chembl-mechanisms.ts` — Added `limit` param
- `src/lib/api/clinvar.ts` — Added `limit` param
- `src/lib/api/string-db.ts` — Added `requiredScore` param