# BioIntel Discovery Workbench — Design Document

**Product:** BioIntel Explorer → BioIntel Discovery Workbench  
**Audience:** Implementers (engineers / agents) working in `C:\Users\kevin\workspace\kBioIntelBrowser04052026`  
**Author role:** Principal product + systems design  
**Status:** Implementable redesign (not a UI-polish list) — **Rev 3** (user open questions resolved as selectable preferences)  
**Constraint law:** Free public APIs only; evidence-first; no regulatory decision support  
**Canonical project copy:** `docs/design/discovery-workbench-v1.md` (must stay identical to this document)

---

## 0. Strategic north star (product law)

> **BioIntel is a free, evidence-first biomolecule discovery workbench.**  
> It helps researchers go from **disease / target / phenotype → ranked candidate molecules → mechanistic & safety evidence → cited hypothesis → next experiment** — without hiding uncertainty.

Everything below is subordinate to this loop. Features that do not advance at least one arrow in the loop are deferred or demoted to Experimental.

### Beachhead (default recommendation)

**Target-led small-molecule repurposing and early candidate triage** for academic, rare-disease, and translational labs.

| In beachhead | Explicitly later |
|---|---|
| Small molecules with structure IDs (CID / InChIKey / ChEMBL) | Antibodies, ADCs, gene therapy, cell therapy as first-class entities |
| Known + near-known chemical space (approved, clinical, bioactive) | De novo generative chemistry |
| Disease → target → candidate triage | Full portfolio management / CRO workflows |
| Evidence packs for grant / lab-meeting hypotheses | Regulatory submissions, labeling decisions |

**Why this beachhead:** The codebase already has PubChem hub identity, ChEMBL/DGIdb/Open Targets/CT.gov/openFDA depth, a disease-rank path (`/discover` + `candidateRanker`), and hypothesis intersection. Academic / rare-disease users need *transparent free evidence*, not DrugBank-depth commercial licensing. Small-molecule identity is solvable with free structure IDs; biologics identity is a different product.

### Product preference law (Rev 3 — FINAL)

Kevin’s former open questions are **not** locked as code-only constants. They are **user-selectable discovery preferences** with documented defaults and tooltips (KD21). Defaults:

| Preference | Default | Alternatives always offered in UI |
|---|---|---|
| Rubric preset | **Balanced** | Repurposing-heavy, Novel bioactive-heavy (+ optional Safety-first) |
| AE aggressiveness | **Soft flag** | Hard score penalty |
| Safety/novelty timing | **Board/promote-time** | Always rank-time (top-15); sticky preference |
| Collaboration | **Solo + file export** | Server share links (PR18) discoverable as “Share pack” when ready |
| GuidedTour examples | **Mix rare + common** | Common-only, Rare-only |

---

## 1. Problem & goals

### 1.1 Problem statement

Today BioIntel is an excellent **multi-source molecule browser** with emerging discovery surfaces (`/discover`, `/hypothesis`, `/disease`, `/gene`). It is not yet the place a bioengineer opens when they wake up thinking:

> “For disease X (or target Y), what small molecules should I investigate next, why, what could kill them, and what experiment do I run Monday?”

Root causes (structural, not cosmetic):

1. **Identity is CID-primary.** Discovery science is disease/target-primary. Molecule profiles are deep; the path *to* a shortlist is shallow and partially disconnected.
2. **Profiles over workflows.** Category fan-out (~9 categories, dozens of panels) optimizes for completeness of *one molecule*, not decision quality across *N candidates*.
3. **No durable candidate board.** Discover produces a ranked list that evaporates; favorites/watchlist are CID favorites, not project-scoped triage boards with scoring state.
4. **Claims are implicit.** Data lands in panels; claims are not first-class objects with provenance.
5. **Scoring is opaque and fixed.** `candidateRanker.ts` hardcodes weights; no safety/novelty axes; no user-editable rubric.
6. **AI can still invent under pressure.** Completeness gates exist, but no structured claim schema binding AI output to evidence graph nodes.
7. **Breadth tax.** Experimental/stub/disabled sources still occupy IA mental space.
8. **Silent disease pick.** `rankCandidatesForDisease` takes `diseaseResults[0]` with no confirm.

### 1.2 User jobs (JTBD)

| Job | Trigger | Done when |
|---|---|---|
| **J1 — Frame the disease** | Rare disease / phenotype / indication | Disease **confirmed**; top targets + source status |
| **J2 — Choose targets** | Mechanistic entry points | 1–5 targets pinned; gene pages linked |
| **J3 — Assemble candidates** | Molecules to investigate | Ranked shortlist with transparent scores + identity trust |
| **J4 — Kill / promote** | Limited assay budget | Board status + axis scores (preferences applied) |
| **J5 — Mechanistic deep-dive** | Shortlist 3–8 | Evidence pack cited |
| **J6 — Write research hypothesis** | Grant / notebook | Versioned ResearchHypothesis + pack |
| **J7 — Stay current** | Active project | Signals on board molecules |

### 1.3 Goals (product outcomes)

1. Primary path is disease/target → candidates.
2. Every ranking dimension is inspectable, reweightable, and **preference-driven** (presets, AE policy, harvest timing).
3. Every AI/scientific claim attachable to retrieved evidence with provenance.
4. Projects hold candidate boards (local-first, exportable); share optional when PR18 lands.
5. Core data tier loads fast and is trustworthy.
6. Molecule profiles remain world-class as depth stations.

### 1.4 Non-goals (explicit)

| Non-goal | Why |
|---|---|
| Regulatory decision support | Liability + wrong product |
| Matching DrugBank / Cortellis paid depth | Free-API-only law |
| API-count vanity | Breadth already exceeds decision depth |
| Biologics / gene-therapy entity model in v1 | Different identity graph |
| Multi-tenant cloud project DB as v1 **requirement** | Solo + export default; server share is optional PR18 |
| Generative de novo design | Different trust bar |
| “This drug will work” predictions | Investigation priority only |
| Replacing PubChem / ChEMBL / OT as system of record | We orchestrate and cite |

### 1.5 Success metrics (non-vanity) + event schema

| Metric | Definition | Target | Events |
|---|---|---|---|
| **M1 — Loop completion** | Discover start → board save → pack or ResearchHypothesis open | ↑ primary | `discover_started` → `board_candidate_added` → `pack_opened` \| `research_hypothesis_opened` |
| **M2 — Board depth** | Median non-untriaged after board session | ↑ | `board_status_changed` |
| **M3 — Citation density** | Median claims with source+retrievedAt per export | ≥ 5 | `pack_exported` |
| **M4 — Score / preference inspect** | Sessions with score expand, weight change, **or preference change** | ≥ 20% | `score_breakdown_opened`; `rubric_changed` `{preset}`; `preference_changed` `{key, value}` |
| **M5 — AI refuse-correctness** | Gate should-fire → refused | ≥ 95% | `ai_response` |
| **M6 — Core reliability** | Core source success | ↑ | API health + `source_status_shown` |
| **M7 — Time-to-shortlist** | Confirmed disease → cheap axes list | P50 ≤ 15s, P95 ≤ 45s | `discover_stage` (incl. optional `harvest_safety_done`) |
| **M8 — Return project** | Reopen within 7 days | ↑ | `project_opened` |
| **M9 — Preference transparency** | Share of discover sessions where at least one non-default preference is used *or* tooltip opened | Observational | `preference_tooltip_opened` `{key}`; `preference_changed` |

**M1 is the Definition-of-Done north metric** (§15.3). Instrument in PR16; emit `preference_changed` from PR4.

---

## 2. User journeys

### 2.1 Primary journey

```
Disease Q → Disambiguate/confirm EFO → Target shortlist (OT) → pin 1–5
  → Candidate engine (prefs applied) → Rank + score → Project board
  → promote (+ harvest if deferred) → Evidence pack → Research hypothesis → Next experiment
```

| Step | User action | System behavior | Paths |
|---|---|---|---|
| 1. Frame | Disease / phenotype | Multi-hit disambiguation; never silent `results[0]` when >1 | `diseaseSearch`, diseaseId hard pin |
| 2. Targets | Pin targets | OT scores; DisGeNET Supporting only | `getTargetsForDisease` |
| 3. Discover | Find candidates | Staged; **respect harvestTiming + rubric preset + aePolicy** | split APIs §5.1.5; prefs §5.3.1 |
| 4. Triage | Status + optional weight tweak | Board + axes; AE soft badges vs hard penalty | Project board |
| 5. Depth | Open candidate | Decision profile + context strip | ProfileModeToggle |
| 6. Pack | Build pack | Download-primary export | evidence/pack |
| 7. Research hypothesis | Seed from pack | Under project route | `/projects/.../hypothesis/...` |
| 8. Experiment | Copilot structured | NextExperiment[] from gaps | aiTasks/suggestNext |
| 9. Share (optional) | Share pack | File export always; **Share link** when PR18 | pack UI |

### 2.2 Secondary journeys

**A.** Target-first via `/gene/[id]`. **B.** Molecule-first depth. **C.** Set-ops `/hypothesis` → board. **D.** Cohort/compare. **E.** Watch signals.

### 2.3 Anti-journeys

- Every API for a string. · Clinical prescribe/don’t. · De novo scaffold IC50 invention.

---

## 3. Domain model

### 3.1 Entity types

Domain layer: `src/lib/domain/`. API DTOs stay in `src/lib/types.ts`.

#### Disease / Target / ScoreVector / MoleculeCandidate

```ts
// src/lib/domain/entities.ts (excerpts)
export interface DiseaseEntity {
  id: string
  idNamespace: 'efo' | 'mondo' | 'orphanet' | 'mesh' | 'ot' | 'name'
  name: string
  synonyms: string[]
  description?: string
  therapeuticAreas: string[]
  xrefs: Array<{ system: string; id: string }>
  identityTrust: IdentityTrust
}

export interface TargetEntity {
  id: string
  symbol: string
  name?: string
  uniprotAccessions: string[]
  chemblTargetIds?: string[]
  organism: 'human' | string
  associationToDisease?: {
    diseaseId: string
    score: number
    datatypeScores?: Record<string, number>
    source: string
  }
  identityTrust: IdentityTrust
}

// src/lib/domain/score.ts
export interface ScoreVector {
  composite: number
  axes: {
    efficacy: number | null
    clinicalStage: number | null
    safety: number | null
    novelty: number | null
    identityTrust: number | null
  }
  axisStatus: {
    efficacy: EpistemicStatus | 'computed'
    clinicalStage: EpistemicStatus | 'computed'
    safety: EpistemicStatus | 'computed'
    novelty: EpistemicStatus | 'computed'
    identityTrust: EpistemicStatus | 'computed'
  }
  rubricVersion: 1
  scorePhase: 'cheap' | 'full'
  /** Soft-flag path may attach non-scoring markers */
  safetyFlags?: Array<{ kind: 'ae_burden' | 'recall' | 'serious_ae'; severity: 'info' | 'warn' | 'high'; label: string }>
}
```

Legacy map: `clinicalPhase`→clinicalStage; gene/shared→efficacy; `compositeScore`→composite until PR4; source-count confidence → **evidence breadth** chips only.

```ts
export type CandidateOrigin =
  | 'opentargets-known-drug' | 'dgidb' | 'chembl-activity' | 'chembl-indication'
  | 'clinicaltrials-intervention' | 'bindingdb-enrichment' | 'similarity'
  | 'hypothesis-intersect' | 'manual'

export interface MoleculeIdentity {
  inchiKey?: string
  smiles?: string
  pubchemCid: number | null
  chemblId?: string
  chebiId?: string
  drugbankId?: string
  name: string
  synonyms: string[]
  identityTrust: IdentityTrust
  alternateCids?: number[]
}

export interface MoleculeCandidate {
  candidateId: string
  identity: MoleculeIdentity
  origins: CandidateOrigin[]
  evidenceBreadthSources: string[]
  links: Array<{
    type: 'binds-target' | 'indicated-for' | 'trial-for' | 'similar-to' | 'associated'
    targetId?: string
    diseaseId?: string
    evidenceRefIds: string[]
  }>
  scores?: ScoreVector
  boardStatus?: BoardStatus
}
```

#### `computeCandidateId`

```ts
// Preference: ik:InChIKey | ch:CHEMBLid | cid:N | nm:sha256(normalizedName).slice(0,16)
// Origins NEVER enter the id. Name: NFKC, trim, collapse space, lower-case.
export function computeCandidateId(identity: Pick<MoleculeIdentity, 'inchiKey' | 'chemblId' | 'pubchemCid' | 'name'>): string
```

#### EvidenceClaim / ResearchHypothesis / Project / DiscoveryResult

Same as Rev 2: mandatory provenance on claims; `ResearchHypothesis` under projects (not set-ops); Project with packIndex; DiscoveryResult schemaVersion 2 with `needsDiseaseConfirmation`, `rubric`, `scorePhase`, `timingMs`.

```ts
export type EpistemicStatus =
  | 'supported' | 'empty' | 'error' | 'timeout' | 'disabled' | 'not-retrieved'

export type BoardStatus = 'untriaged' | 'promote' | 'hold' | 'kill' | 'watching'

export interface DiscoveryResult {
  schemaVersion: 2
  query: string
  disease: DiseaseEntity | null
  diseaseCandidates?: DiseaseEntity[]
  needsDiseaseConfirmation: boolean
  targets: TargetEntity[]
  candidates: MoleculeCandidate[]
  sourceStatuses: SourceFetchStatus[]
  rubric: ScoreRubric
  /** Echo of prefs used for this run (for export reproducibility) */
  preferencesSnapshot?: Pick<DiscoveryPreferences, 'rubricPreset' | 'aeAggressiveness' | 'harvestTiming'>
  generatedAt: string
  warnings: string[]
  scorePhase: 'cheap' | 'full'
  timingMs?: Partial<Record<'disease' | 'targets' | 'gather' | 'identity' | 'cheapScore' | 'safetyHarvest' | 'total', number>>
}
```

### 3.2 Identity trust vs Evidence breadth

| Concept | UI label | Not called |
|---|---|---|
| Structure/xref quality | **Identity trust** | confidence |
| Source count chips | **Evidence breadth** | confidence |
| Axis epistemic | axisStatus cells | confidence alone |

`IdentityTrust = 'high' | 'medium' | 'low' | 'unresolved'`.

### 3.3 Storage model (v1) — quota-safe

| Entity | Store | Policy |
|---|---|---|
| Project metadata, candidates, rubric, pack index | `biointel-project-v1-{id}` | ≤50 candidates |
| ResearchHypothesis text | `biointel-rh-v1-{id}` | ≤20k chars thesis |
| Evidence packs | Download-primary; optional IDB `biointel-packs` | ≤200 claims; never full claims in localStorage |
| **Discovery preferences** | `biointel-discovery-prefs-v1` | Single JSON blob §5.3.1 |
| Live API | Next revalidate | — |
| Server project DB | Out of v1 **requirement** | PR18 optional share snapshots only |

QuotaExceeded → export prompt; never silent drop.

---

## 4. Information architecture

### 4.1 Navigation

**KD15:** `AppHeader` in `layout.tsx` (PR5): Discover | Projects | search. Set builder = `/hypothesis`.

Homepage: disease-default search; **PR8 conservative copy** until packs; GuidedTour example set from prefs.

### 4.2 Core vs Supporting vs Experimental

**Core:** PubChem, UniChem, Open Targets (blocking disease–target), ChEMBL, DGIdb, CT.gov, openFDA AE+recalls (harvest), PubChem properties (decision profile).

**Supporting (never block):** DisGeNET, Monarch, BindingDB-by-name, EuropePMC novelty, DailyMed, GHS, IUPHAR, pathways, patents, etc.

**Experimental:** `DISABLED_API_SOURCES` stubs.

`PanelDef.tier: 'core' | 'supporting' | 'experimental'`.

### 4.3 Surfaces + decision profile

Decision mode: **ProfileModeToggle** (`decision` | `browser`) — not ViewToggle.

**Decision panels (PanelDef.id):** chembl-mechanisms, chembl, clinical-trials, adverse-events, chembl-indications, properties. Context strip required when `?project=` (scores/claims — anti-cosmetic DoD).

### 4.4 URLs

`/discover?q=&diseaseId=&targets=` · `/projects/...` · packs · ResearchHypothesis · `/molecule/[cid]?project=&disease=` · `/hypothesis` set-ops only.

---

## 5. Core systems design

### 5.1 Candidate discovery engine

**Today:** `candidateRanker.ts` + `GET /api/discover/rank`; silent disease[0]; broken OT drugs-as-targets.

```
src/lib/discovery/
  engine.ts, sources/*, harvest/*, normalize, dedupe, identityResolve, score, rubric, types
src/lib/discovery/preferences.ts   // DiscoveryPreferences load/save + apply
```

#### 5.1.1 Gather feasibility matrix

| Source | Existing | Gap | v1 gather? |
|---|---|---|---|
| OT targets | `getTargetsForDisease` | OK | **Core** |
| OT drugs | `getDrugsForDisease` returns **target names** | Fix knownDrugs GraphQL **PR3b** | After fix only |
| DGIdb | `getTargetRelatedMolecules` | OK | **Core** |
| ChEMBL by target | `searchTargetsByName` + `getRelatedCompoundsByTarget` | gene→CHEMBL target id | **Core PR3b** (5×15) |
| ChEMBL indications | by name | Latency | top 20 |
| CT.gov | interventions | OK | **Core** |
| DisGeNET | no key; fragile | — | **Supporting** |
| BindingDB | name→affinity only | no target→ligand | **Not gather**; enrichment only |
| Similarity | pubchem-similar | noise | Opt-in PR17 |

OT knownDrugs GraphQL (PR3b) — validate live schema; until then exclude broken path.

#### 5.1.2 Pipeline stages

| Stage | Output | Blocks first paint? |
|---|---|---|
| 0 Disease confirm | DiseaseEntity / options | Yes |
| 1 Targets | TargetEntity[] | Yes |
| 2 Gather + dedupe | Candidates | Yes |
| 3 Identity top 25 | identityTrust | Yes for cheap score |
| 4 Cheap score | efficacy, clinicalStage, identityTrust | Yes — **M7 end** |
| 5 Safety/novelty K=15 | safety, novelty | **If harvestTiming=`rank-time`**: after cheap, still progressive UI. **If `board-promote` (default)**: not on first rank; run on promote / Load safety / explicit |
| 6 Return/patch | DiscoveryResult | — |

#### 5.1.3 Scoring evidence harvest contract

**Cheap axes** from gather only (efficacy, clinicalStage, identityTrust).

**Expensive (K=min(limit,15)):**

| Axis | Client | Metric | Timeout | Concurrency |
|---|---|---|---|---|
| safety | `getAdverseEventsByName` + `getDrugRecallsByName` | aeTotal, serious proxy, recallCount → risk → safety=1-risk | 4s | 4 |
| novelty | `getLiteratureHitCount` (EuropePMC) | `1 - min(1, log2(1+hitCount)/log2(1+10000))`; dampen if phaseNorm=1 | 3s | 4 |

Empty AE+recall → axis **null** + `empty` (never “safe”). Fail → renormalize or penalize per rubric.

**AE aggressiveness (prefs) — how safety enters composite:**

| Mode | Scoring path | UI |
|---|---|---|
| **`soft-flag` (default)** | Safety axis still computed when harvested, but **approved / high clinicalStage drugs are not hard-killed**: for candidates with `clinicalStage ≥ 0.75` (or maxPhase≥3), clamp applied safety floor at 0.45 before composite *or* exclude safety from composite and attach `safetyFlags` only | Yellow badge “AE signal — review FAERS bias” |
| **`hard-penalty`** | Safety axis fully weighted in composite with no floor; high AE burden ranks down even for approved drugs | Tooltip: use when kill-risk matters more than repurposing feasibility |

Worked call count (default deferred harvest): ~40–45 upstream; +~30 if rank-time safety.

#### 5.1.4 Split APIs (PR3a–PR4 required)

`GET /api/discover/diseases` · `GET /api/discover/targets` · `GET|POST /api/discover/rank` · `POST /api/discover/harvest`

#### 5.1.5 Dual schema + POST body

Additive `RankResult` with optional `v2?: DiscoveryResult` (KD19).

```ts
export interface DiscoverRankRequest {
  q?: string
  diseaseId?: string
  targets?: string[]          // max 10
  limit?: number              // 1–25, default 15
  rubric?: ScoreRubric
  includeSimilarity?: boolean // default false
  pinOnly?: boolean
  /** Overridden by sticky prefs unless explicit */
  runSafetyHarvest?: boolean
  runNoveltyHarvest?: boolean
  aeAggressiveness?: 'soft-flag' | 'hard-penalty'
  harvestTiming?: 'board-promote' | 'rank-time'
}
// body ≤16KB; 400 if !q && !diseaseId
```

Client maps prefs → request: if `harvestTiming==='rank-time'` then `runSafetyHarvest=true` and `runNoveltyHarvest=true` for top-K after cheap score; else false on rank, true on promote/harvest endpoint.

#### 5.1.6 Failure modes

Multi-hit without diseaseId → confirm. diseaseId unknown → error, no fuzzy substitute. OT down → partial. DisGeNET empty → silent supporting. Caps: 80 names, harvest K=15.

#### 5.1.7 Similarity

Opt-in PR17 only.

### 5.2 Evidence graph

`src/lib/evidence/**` — claim extractors PR9; provenance mandatory.

### 5.3 Scoring rubric + axis formulas

**Philosophy:** Investigation priority proxies — never “success probability.”

#### ScoreRubric

```ts
export type RubricPresetId = 'balanced' | 'repurposing' | 'novel-bioactive' | 'safety-first'

export interface ScoreRubric {
  version: 1
  weights: {
    efficacy: number
    clinicalStage: number
    safety: number
    novelty: number
    identityTrust: number
  }
  missingAxisPolicy: 'renormalize' | 'penalize'
  penalizeValue?: number  // default 0.3 when penalize
  preset: RubricPresetId
  /** From discovery prefs — how AE affects ranking */
  aeAggressiveness: 'soft-flag' | 'hard-penalty'
}

export const RUBRIC_PRESETS: Record<RubricPresetId, ScoreRubric['weights']> = {
  balanced:        { efficacy: 0.30, clinicalStage: 0.25, safety: 0.25, novelty: 0.10, identityTrust: 0.10 },
  repurposing:     { efficacy: 0.20, clinicalStage: 0.35, safety: 0.30, novelty: 0.05, identityTrust: 0.10 },
  'novel-bioactive': { efficacy: 0.40, clinicalStage: 0.10, safety: 0.15, novelty: 0.25, identityTrust: 0.10 },
  'safety-first':  { efficacy: 0.20, clinicalStage: 0.15, safety: 0.45, novelty: 0.05, identityTrust: 0.15 },
}
// safety-first implies missingAxisPolicy: 'penalize' by default when selected
```

#### Axis formulas (0–1)

**efficacy:** max of OT known-drug (0.9), DGIdb shared-gene term, ChEMBL activity term.  
**clinicalStage:** `0.7 * (maxPhase/4) + 0.3 * trialNorm`.  
**safety:** §5.1.3; then apply soft-flag floor or hard-penalty full weight.  
**novelty:** EuropePMC hitCount formula; dampen if approved for disease.  
**identityTrust axis:** high 1.0 / medium 0.66 / low 0.33 / unresolved 0.  
**composite:** weighted sum over non-null axes (renormalize) or penalize nulls.

Fixtures: known drug efficacy ≥0.85; phase4 clinicalStage ≥0.7; obscure bioactive novelty >0.7.

---

### 5.3.1 Discovery preferences UI (FINAL product law)

**Purpose:** All former OQ1–OQ5 are **user-visible controls** with defaults + tooltips. Never hide alternatives as code-only constants (KD21).

#### Preference store

```ts
// src/lib/discovery/preferences.ts
// localStorage key: biointel-discovery-prefs-v1

export type HarvestTimingPref = 'board-promote' | 'rank-time'
export type AeAggressivenessPref = 'soft-flag' | 'hard-penalty'
export type TourExampleSetPref = 'mixed' | 'common-only' | 'rare-only'
export type CollaborationModePref = 'solo-export' | 'share-links-when-available'

export interface DiscoveryPreferences {
  version: 1
  rubricPreset: RubricPresetId              // default: 'balanced'
  aeAggressiveness: AeAggressivenessPref    // default: 'soft-flag'
  harvestTiming: HarvestTimingPref          // default: 'board-promote'
  /** Sticky: when user picks rank-time or board-promote, remember across sessions */
  harvestTimingSticky: boolean              // default: true
  tourExampleSet: TourExampleSetPref        // default: 'mixed'
  collaborationMode: CollaborationModePref  // default: 'solo-export'
  /** Optional custom weights; when set, preset shows as "Custom" until reset */
  customWeights?: ScoreRubric['weights']
  updatedAt: string
}

export const DEFAULT_DISCOVERY_PREFERENCES: DiscoveryPreferences = {
  version: 1,
  rubricPreset: 'balanced',
  aeAggressiveness: 'soft-flag',
  harvestTiming: 'board-promote',
  harvestTimingSticky: true,
  tourExampleSet: 'mixed',
  collaborationMode: 'solo-export',
  updatedAt: new Date(0).toISOString(),
}
```

- Load on Discover / Project board / homepage tour mount.  
- Save on every change; emit `preference_changed`.  
- Project may **snapshot** prefs into board export / DiscoveryResult for reproducibility without mutating global prefs.  
- “Reset to defaults” control required.

#### Controls location

| Control | Primary UI | Also |
|---|---|---|
| Rubric preset | Discover **settings drawer** + `RubricEditor` | Project board score header |
| Custom weight sliders | `RubricEditor` (after preset or custom) | Same |
| AE aggressiveness | Discover settings drawer + RubricEditor “Safety policy” | Board safety column header |
| Harvest timing | Discover settings drawer + checkbox near Run | Board “Load safety” always available |
| Tour example set | Homepage GuidedTour gear / first-run settings | `localStorage` only |
| Collaboration | Project / Pack export menu: **Download** always; **Share link** if PR18 + mode allows | Prefer mode does not block Download |

Component sketch:

- `src/components/discovery/DiscoverySettingsDrawer.tsx`  
- `src/app/discover/components/RubricEditor.tsx` (expanded PR4)  
- `src/lib/discovery/preferences.ts`  
- `src/components/home/GuidedTour.tsx` reads `tourExampleSet`

#### Tooltip copy outlines (implementer-ready)

Tooltips must answer: (1) how options differ, (2) why rankings change, (3) when relevant.

**Rubric preset**

| Option | Differs how | Ranking impact | When relevant |
|---|---|---|---|
| Balanced (default) | Equal-ish triage across efficacy, stage, safety | No single axis dominates | General / first use |
| Repurposing-heavy | ↑ clinicalStage + safety; ↓ novelty | Approved/clinical candidates rise; obscure bioactives fall | Rare-disease drug reuse, known-safety bias |
| Novel bioactive-heavy | ↑ efficacy + novelty; ↓ clinicalStage | Tool compounds / early actives rise; phase 4 may fall | New target chemistry, SAR exploration |
| Safety-first (optional extra) | ↑ safety weight; missing safety penalized | Sparse AE data hurts rank | Conservative labs |

*UI prompt when relevant:* after a rank with many phase≥3 drugs, show hint: “Mostly clinical candidates — try **Novel bioactive** if you want earlier chemical matter.” After many low-phase hits: “Try **Repurposing** to prioritize human-stage molecules.”

**AE aggressiveness**

| Option | Differs how | Ranking impact | When relevant |
|---|---|---|---|
| Soft flag (default) | FAERS/recall as badges; soft floor for high clinicalStage | Approved drugs rarely buried by AE volume alone | Repurposing; FAERS reporting bias high |
| Hard score penalty | Full safety weight in composite, no floor | High AE counts push candidates down even if approved | Want kill-risk visibility over feasibility |

*Tooltip must say:* FAERS is voluntary/stimulated reporting — not incidence. Empty ≠ safe. Hard mode can over-penalize widely used drugs.

**Harvest timing**

| Option | Differs how | Latency / axes | When relevant |
|---|---|---|---|
| Board/promote-time (default) | openFDA + literature after promote or “Load safety scores” | Protects M7 cheap shortlist; safety/novelty null until loaded | Fast triage, large candidate sets |
| Always rank-time (top-15) | Harvest immediately after cheap score for top 15 | +~8–12s typical; full axes on first list | Decision-ready list in one pass |

Sticky: changing timing saves to prefs when `harvestTimingSticky` true (default). Session override checkbox without sticky optional in drawer.

**Collaboration**

| Option | Differs how | What user gets | When relevant |
|---|---|---|---|
| Solo + file export (default) | No server project DB | Download project/pack JSON/MD always | Privacy, offline, v1 default |
| Share links when available | Enables **Share pack** (PR18 snapshot) when shipped | Content-hashed TTL link; still not multi-tenant edit | Collab / grant coauthors |

*Until PR18:* Share control visible but disabled with tooltip “Coming soon — use Download JSON for now” **or** hidden with “Share (optional, soon)” note in export menu — must remain **discoverable**, not buried in docs only. Prefer disabled-with-tooltip for discoverability.

**GuidedTour examples**

| Option | Differs how | When relevant |
|---|---|---|
| Mixed rare + common (default) | e.g. ATTR-like / rare phenotype + diabetes/NSCLC-style | Broad audience |
| Common-only | High-data-density indications | Teaching / demos with rich public data |
| Rare-only | Rare/phenotype-first examples | Rare-disease labs |

#### Parameter wiring matrix

| Preference | Flips |
|---|---|
| `rubricPreset` | `ScoreRubric.weights` (+ safety-first → `missingAxisPolicy: penalize`) |
| `customWeights` | Overrides preset weights; export still records full rubric |
| `aeAggressiveness` | Soft floor + flags vs full safety in composite (§5.1.3) |
| `harvestTiming=rank-time` | `runSafetyHarvest` + `runNoveltyHarvest` true after cheap score |
| `harvestTiming=board-promote` | harvest false on rank; true on promote / harvest API |
| `tourExampleSet` | GuidedTour example chips only |
| `collaborationMode` | Enables Share CTA behavior when PR18 present |

#### Analytics

`preference_changed` `{ key, value, source: 'drawer'|'rubric'|'tour' }`  
`preference_tooltip_opened` `{ key }`

---

### 5.4 Evidence packs

Versioned, download-primary, ≤200 claims, contentHash for cite. Snapshot optional PR18.

### 5.5 AI co-pilot contracts

Existing `PromptMode` molecule path preserved. Pack modes: structured JSON + claim-id validation. Gates: panel completeness (molecule); ≥6 claims / 3 facets (deep pack modes).

### 5.6 Watchlist / signals

Count diffs + deep-link to panel; not badge-only.

---

## 6. Architecture

### 6.1–6.2 Stack / layers

Next.js 14 App Router; domain services over free API clients; AppHeader + DiscoverySettingsDrawer in UI layer.

### 6.3 Migration

M0 types/tiers → M1 statuses/disease confirm → M2 gather+prefs scoring → M3 projects → M4 homepage → M5 packs/decision → M6 AI/signals/metrics. No big-bang.

### 6.4 File ownership

| Concern | Paths |
|---|---|
| Discovery + prefs | `src/lib/discovery/**`, `preferences.ts` |
| Rank/harvest API | `src/app/api/discover/**` |
| Discover UI | `src/app/discover/**`, `DiscoverySettingsDrawer` |
| Projects | `src/app/projects/**`, `src/lib/project/**` |
| Evidence | `src/lib/evidence/**` |
| AI | `src/lib/ai/**` |
| Set-ops | `src/lib/hypothesis/**` |
| Research hypothesis | `src/lib/project/researchHypothesis.ts` |
| App shell | `AppHeader`, `layout.tsx` |

### 6.5 Performance

M7 = cheap shortlist P50≤15s / P95≤45s. Rank-time harvest adds ≤12s P50. Call budgets: concurrency 8; genes 5–10; compounds/target 15; names 80; indications 20; identity 25; harvest 15 @ concurrency 4.

---

## 7. Data strategy

Free APIs only. Core: PubChem, UniChem, OT, ChEMBL, DGIdb, CT.gov, openFDA harvest, properties. Supporting: DisGeNET, Monarch, BindingDB-by-name, EuropePMC, etc. Disabled stubs stay out. Packs point-in-time.

---

## 8. Trust & scientific integrity

Empty ≠ absence · no marketing inflation · scores = triage aids · safety empty ≠ green · AI claim-bound on packs · identity trust banners · disease confirm · FAERS bias in AE tooltips · preference tooltips must not oversell certainty.

Golden fixtures: PR4 rank (+ soft vs hard AE path tests); PR9 claims; PR13 AI.

---

## 9. Alternatives considered

### 9.1 Molecule-first vs Disease-first  
**Decision:** Disease/target workflow; molecule depth preserved.

### 9.2 Local vs Cloud AI  
**Decision:** Local-first; ranking without LLM.

### 9.3 Score-heavy vs Unranked  
**Decision:** Hybrid + always-visible axes.

### 9.4 Server vs Local projects  
**Decision (FINAL):** Default **solo + file export**. Server share links are **optional, discoverable** (PR18 “Share pack”), not a v1 requirement and not buried forever.

### 9.5 More APIs vs Deeper Core  
**Decision:** Deeper Core.

### 9.6 Rank-time vs Board-time safety  
**Decision (FINAL):** Default **board/promote-time** (KD16). **Always rank-time** and sticky preference are first-class UI options (§5.3.1). Not code-only.

### 9.7 Single locked rubric vs user presets  
**Decision (FINAL):** Default balanced; all presets selectable with tooltips (KD21).

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| False precision | Axes, disclaimers, presets, export rubric+prefs snapshot |
| Disease ambiguity | Confirm UI + diseaseId pin |
| Wrong identity | InChIKey-first; trust badges |
| Upstream breakage | Ternary statuses |
| AI hallucination | Claim validation |
| localStorage quota | Download packs; caps |
| Latency | Staged APIs; default deferred harvest |
| FAERS bias | Soft default + tooltips; empty ≠ safe |
| Preference overload | Defaults + progressive disclosure drawer |
| Share buried | Disabled-with-tooltip Share until PR18 |
| Cosmetic decision profile / signals | Explicit DoD |

---

## 11. Phased delivery

| Phase | PRs |
|---|---|
| Q1 Foundations | PR1–PR4 (prefs in PR4), PR3a–c, PR6b |
| Discovery workbench | PR5–PR8 (tour set) |
| Depth | PR9–PR12 |
| Platform gravity | PR13–PR18 (Share pack) |

---

## 12. Key Decisions

| # | Decision | Rationale |
|---|---|---|
| **KD1** | Beachhead small-molecule repurposing / early triage | Free API fit |
| **KD2** | Disease/target → candidates primary | Product law |
| **KD3** | InChIKey > ChEMBL > CID > name | Merge safety |
| **KD4** | EvidenceClaim + provenance | Packs + AI + trust |
| **KD5** | Editable multi-axis scores | Transparent triage |
| **KD6** | Core / Supporting / Experimental | Trust + latency |
| **KD7** | Projects local-first default | Ship without auth |
| **KD8** | Deterministic ranking without AI | Integrity |
| **KD9** | AI structured on pack modes | No dual breakage |
| **KD10** | Incremental facade migration | Risk control |
| **KD11** | Hybrid ranking | Speed vs false precision |
| **KD12** | Non-goals: regulatory, paid DB, API bloat | Focus |
| **KD13** | Count signals + deep-link DoD | Reuse changeDetection |
| **KD14** | Homepage disease emphasis | IA without stranding |
| **KD15** | AppHeader Discover/Projects | Discoverability |
| **KD16** | Safety/novelty harvest **default board/promote-time**; rank-time selectable + sticky | Protect M7; user control |
| **KD17** | ResearchHypothesis vs set-ops `/hypothesis` | Avoid merge cost |
| **KD18** | DisGeNET/Monarch/BindingDB-by-target not Core gather | Feasibility honesty |
| **KD19** | Additive RankResult + `v2` | Mergeable PRs |
| **KD20** | Packs download-primary | Quota reality |
| **KD21** | **User-selectable discovery preferences** (rubric preset, AE aggressiveness, harvest timing, tour examples, collaboration mode) with defaults + tooltips; **never hide OQ1–OQ5 alternatives as code-only constants** | Kevin final; scientific transparency |

---

## 13. Resolved product preferences (FINAL)

Former open questions — **closed**. Defaults + mandatory UI alternatives:

| # | Topic | Default | Must offer in UI | Wires to |
|---|---|---|---|---|
| **R1** | Rubric preset | **Balanced** | Repurposing-heavy, Novel bioactive-heavy (+ Safety-first optional) | `ScoreRubric.weights` / preset id; contextual hints when rank skews clinical vs early |
| **R2** | AE aggressiveness | **Soft flag** | Hard score penalty | Soft floor + `safetyFlags` vs full safety weight; FAERS tooltips |
| **R3** | Safety/novelty timing | **Board/promote-time** | Always rank-time (top-15); sticky preference | `runSafetyHarvest` / harvest API / promote hooks |
| **R4** | Collaboration | **Solo + file export** | Server share links as optional path | Download always; Share pack (PR18) discoverable |
| **R5** | GuidedTour examples | **Mix rare + common** | Common-only, Rare-only | Tour config from prefs |

Full control/tooltip/storage spec: **§5.3.1**. No further product debate required for implementation.

---

## 14. PR Plan

Ordered for mergeability. PR3 = 3a/3b/3c. Disease disambiguation = PR6b before PR8.

### PR1 — Domain types & wire contracts  
`feat(domain): ScoreVector, DiscoveryResult, candidateId, IdentityTrust, DiscoveryPreferences types`  
Files: `src/lib/domain/**`, `src/lib/discovery/preferences.ts` (types + defaults only), tests.  
Depends: none.

### PR2 — Panel tier tags  
`feat(config): Core/Supporting/Experimental panel tiers`  
Depends: none (∥ PR1).

### PR3a — Engine extract + statuses + dual schema  
`refactor(discovery): extract gather; sourceStatuses; stop OT target-names-as-drugs`  
Depends: PR1.

### PR3b — OT knownDrugs + ChEMBL-by-target  
`feat(discovery): knownDrugs GraphQL + ChEMBL target→compound`  
Depends: PR3a.

### PR3c — Batch identity InChIKey  
`feat(discovery): identity resolve + IdentityTrust`  
Depends: PR3a (∥ 3b after 3a).

### PR4 — Multi-axis scoring + harvest + **preferences UI**  
**Title:** `feat(discovery): multi-axis scores, harvest stages, DiscoverySettings + RubricEditor prefs`  

**Files:**  
- `score.ts`, `rubric.ts`, `harvest/safetyHarvest.ts`, `harvest/noveltyHarvest.ts`  
- `POST /api/discover/harvest`, rank request pref fields  
- `CandidateCard` breakdown  
- **`RubricEditor`**: preset selector (Balanced / Repurposing / Novel bioactive [/ Safety-first]), weight sliders, **AE aggressiveness** soft vs hard, tooltips per §5.3.1  
- **`DiscoverySettingsDrawer`**: harvest timing (board-promote vs rank-time) + sticky toggle; links to rubric; reset defaults  
- `preferences.ts` load/save `biointel-discovery-prefs-v1`  
- `useDiscovery.ts` stages: apply prefs → rank → optional harvest  
- `GET /api/discover/targets`  
- golden fixtures (ATTR-like, EGFR-like) **including soft vs hard AE ranking delta**  
- events: `discover_stage`, `preference_changed`, `rubric_changed`

**Depends on:** PR3a; harvest uses PR3b gather when available  

**Description:** Formulas §5.3; **default** harvest deferred; rank-time optional; soft AE default with hard path; M7 = cheap score. Tooltips mandatory for every preference control.

### PR5 — Projects + AppHeader  
`feat(projects): board, export/import, AppHeader`  
Quota UX; promote triggers harvest when timing=board-promote.  
Depends: PR1; best after PR4.

### PR6 — Identity trust UI  
Depends: PR3c, PR5.

### PR6b — Disease disambiguation  
`feat(discover): multi-hit confirm + diseaseId hard pin`  
Depends: PR3a. **Before PR8.**

### PR7 — Disease & gene CTAs  
Depends: PR5, PR6b.

### PR8 — Homepage IA + GuidedTour example set  
**Title:** `feat(ia): disease-default homepage; GuidedTour example-set preference`  

**Files:** `page.tsx`, `GuidedTour.tsx`, preferences `tourExampleSet`  

**Depends on:** PR5, PR6b, PR4 preferred  

**Description:** Conservative hero copy until packs. Tour examples: **mixed (default) / common-only / rare-only** from prefs (gear on tour or settings). Sample chips swap with preference.

### PR9 — Evidence claim extractors  
Depends: PR1, PR4.

### PR10 — Evidence packs download-primary  
Depends: PR5, PR9. Export menu shows Download; Share placeholder per §5.3.1.

### PR11 — Decision profile + ProfileModeToggle  
Anti-cosmetic DecisionStrip DoD. Depends: PR2, PR9.

### PR12 — Set-ops ↔ board / ResearchHypothesis bridges  
No type unification. Depends: PR5, PR10.

### PR13 — AI pack contracts  
Depends: PR9–PR10.

### PR14 — Signals deep-link DoD  
Depends: PR5.

### PR15 — Discover pin UX polish  
Stages already in PR4. Depends: PR4, PR7.

### PR16 — Product analytics M1–M9  
Includes preference events.  

### PR17 (stretch) — Similarity expansion  
Depends: PR3b, PR5.

### PR18 (stretch) — Shareable pack snapshots  
**Title:** `feat(share): server snapshot links for evidence packs (“Share pack”)`  

**Files:** `snapshot/store.ts`, pack Share button, enable when `collaborationMode` allows  

**Depends on:** PR10  

**Description:** Content-hashed TTL snapshots. **Discoverable** export option — not docs-only. Until merged, UI may show disabled Share with tooltip. Default collaboration remains solo export; this is the optional server path Kevin required to keep open.

---

## 15. Implementation notes

### 15.1 Testing

Pure: score, dedupe, candidateId, prefs apply, soft vs hard AE, claim extract, AI validate. Fixtures PR4/PR9/PR13.

### 15.2 Backward compatibility

Molecule routes intact; additive RankResult; disabled sources stay disabled.

### 15.3 Definition of done — workbench v1 (M1 + preferences)

Researcher can:

1. Confirm disease when multi-hit,  
2. Pin targets,  
3. Get cheap ranked shortlist within M7 (default prefs),  
4. Open settings and switch preset / AE policy / harvest timing with understandable tooltips,  
5. Load safety on promote (default) or at rank-time if chosen,  
6. Save board and triage,  
7. Build + download evidence pack,  
8. Create ResearchHypothesis + next experiments,  
9. Export files; optionally Share pack when PR18 available,  
10. See GuidedTour examples matching tour preference,

…without paid APIs or clinical decision claims.

**M1 event chain + at least one preference control with tooltip must ship in the happy path.**

---

## 16. Appendix A — Existing → future role

| Existing | Future |
|---|---|
| `/molecule` profile | Depth + decision mode |
| `/discover` + ranker | Primary engine + prefs |
| `/hypothesis` | Set-ops only |
| `/disease`, `/gene` | Entry + depth |
| Watchlist + changeDetection | Signals |
| AI completeness gate | + claim-bound pack modes |
| snapshot/store | Share pack PR18 |
| UniChem + resolveApiQuery | Identity backbone |

---

## 17. Appendix B — Example pack (**illustrative only — not a golden fixture**)

```json
{
  "id": "pack_illust_01",
  "version": 1,
  "title": "Illustrative triage pack (fake ids)",
  "preferencesSnapshot": {
    "rubricPreset": "balanced",
    "aeAggressiveness": "soft-flag",
    "harvestTiming": "board-promote"
  },
  "disease": { "id": "EFO_ILLUSTRATIVE", "name": "Example amyloid cardiomyopathy", "idNamespace": "efo" },
  "targets": [{ "symbol": "TTR", "id": "ENSG_ILLUSTRATIVE" }],
  "candidates": [],
  "claims": [],
  "rubric": {
    "version": 1,
    "preset": "balanced",
    "aeAggressiveness": "soft-flag",
    "weights": { "efficacy": 0.3, "clinicalStage": 0.25, "safety": 0.25, "novelty": 0.1, "identityTrust": 0.1 },
    "missingAxisPolicy": "renormalize"
  }
}
```

Golden fixtures: `__tests__/fixtures/discovery/`.

---

## Document control

- **Rev 1:** Initial workbench redesign.  
- **Rev 2:** Design review fixes (harvest, gather feasibility, dual schema, PR3 split, DisGeNET honesty, etc.).  
- **Rev 3:** Kevin open questions → **FINAL selectable preferences** (§5.3.1, §13, KD21); PR4/PR8/PR18 updated; defaults Balanced / Soft AE / Board-promote harvest / Solo export / Mixed tour.  
- **Canonical copies (must be identical):**  
  - `C:\Users\kevin\AppData\Local\Temp\grok-kevin\grok-design-doc-0c1530f8.md`  
  - `docs/design/discovery-workbench-v1.md`  
- Does not authorize: regulatory claims, paid APIs, biologics v1, big-bang rewrite.  
- Engineering: PR1–PR2 now; PR3a after §5.1.1; PR4 implements full preference UI.
