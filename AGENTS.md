# AGENTS.md — BioIntel Discovery Workbench

Coding agents and human implementers: read this before changing product behavior.

## Product law (non-negotiable)

- Free public APIs only (no paid DBs / keys as product requirements)
- Evidence-first; no regulatory decision support language
- Solo + file export default (localStorage / IDB / download); share optional
- **Discover of-record ranking is deterministic (no LLM in the rank path)**
- **Optional AI analysis views** may reorder or recommend candidates with model-generated reasoning, using only retrieved evidence and the user’s connected model (e.g. Ollama Cloud). AI views must be labeled non-of-record, must not overwrite deterministic scores/axes, and must not auto-apply board decisions. Users verify before wet-lab / grant / clinical use
- Pack / RH AI remains claim-bound structured output; Copilot may use allowlisted evidence tools
- Canonical product events only — do not reintroduce dual-emit aliases
- Board packs: 5 extractor panels max; preserve claim `subjectCandidateId`

## Canonical docs

- `docs/design/discovery-workbench-v1.md` — product law, metrics M1–M9, beachhead
- `docs/design/discovery-workbench-v2.md` — loop-completion redesign (shipped)
- `docs/design/discovery-workbench-v2.1.md` — post-v2 hardening + measurement (active plan)
- `docs/design/profile-revisit-cache.md` — search-history reopen: session cache (shipped) + IDB durability (Phase B)
- `docs/design/agentic-workflow-cli.md` — full CLI cookbook, playbooks, API surfaces
- `docs/design/ai-analysis-view.md` — dual-view: of-record rank vs optional AI analysis
- `docs/design/public-apis-international.md` — free foreign-regulator / research APIs (Health Canada, WHO GHO, …)
- `docs/design/free-api-agent.md` — policy agent for free-API timeout/retry/empty + etiquette (not LLM facts)
- `docs/design/discovery-workbench-v3.md` — ambitious scope expansion (safety triangulation, five-regulator, campaigns, kit v2)
- `docs/golden/` — beachhead golden disease/CID expectations

## Canonical code areas

- Discover: `src/app/discover/**`, `src/lib/discovery/**`
- Projects / packs / RH: `src/lib/project/**`, `src/components/evidence/**`
- Events: `src/lib/productEvents.ts`
- Extractors: `src/lib/evidence/extractAll.ts`
- Search history sidebar: `src/lib/searchHistory.ts`, `src/components/layout/SearchHistorySidebar.tsx`
- Profile revisit cache: `src/lib/profileClientCache.ts`, `src/lib/profileRevisitIdb.ts`, `src/lib/fetchCategory.ts`
- **Free-API agent (policy + etiquette, not LLM):** `src/lib/api/freeApiAgent.ts`, `leafRouteAgent.ts`, `timedFetch.ts`, `freeApiEtiquette.ts`, `src/lib/rateLimit.ts` — centralize timeout/retry/abort/empty **and** free-API etiquette (host rate limits, concurrency, Retry-After, polite User-Agent) so we do not stampede public APIs into 429s. Molecule leaf routes use `moleculeLeafGet`. Do **not** re-hardcode per-file retry/rate-limit rules. Of-record data still free public HTTP only.
- **v3 of-record expansion:** `safetyTriangulation.ts`, `fiveRegulatorCard.ts`, `citationCompleteness.ts`, `campaign/campaignWorkspace.ts`; research kit `schemaVersion: 2` + `v3-quality.json`

## UI chrome (agents)

- **Search history sidebar**: width CSS var `--app-sidebar-width` (2.5rem collapsed / 18rem expanded); header + main pad with it so canvas centers in remaining space
- **UI density**: Comfortable | Dense toggle (`biointel-ui-density-v1`); comfortable shows short description previews + tips
- **AI copilot FAB**: bottom-right on profile pages (`data-testid="ai-copilot-fab"`); configure AI via header chip
- **API sources share**: `npm run export:api-sources` → `docs/api-sources-manifest.json`
- **Optional free keys**: `docs/operator-free-api-keys.md` (never product requirements)
- **Data hub (of-record facts)**: Fact|Value|Source|Open ledger on molecule / gene / disease / org — `src/lib/dataHub/*`, `DataHubLedgerView`; CSV/TSV + **Research kit** multi-file export; source directory; molecule **Research** view + gene Research tab; Discover **mini hub**; **compare side-by-side hub**; public **`/methodology`**; **saved research view prefs** (`biointel-research-view-prefs-v1`). Derived charts/AI labeled non-of-record. See `docs/design/data-hub-presentation.md`

## Commands

```text
npm run dev                              # required before e2e (no Playwright webServer by default)
npx tsc --noEmit
npm test
npm run test:precommit                   # **before commit** — tsc + lint + fullApp + of-record
npm run test:precommit:full              # precommit + broader component smoke
npm run test:full-app                    # all cards/provenance/diagnostics/chrome inventory
npm run test:capabilities                # capability inventory + fullApp + brittleness
npm run test:brittle                     # React-safe / expand / data-hub UI suites
npm run test:gate                        # tsc + of-record + fullApp + brittleness
npm run test:e2e:full-app                # Playwright full-app (needs app or E2E_WEBSERVER)
npm run test:e2e:full-app:auto           # full-app e2e + Playwright starts next dev
npm run ship:verify                      # local precommit + git hygiene (agents)
npm run ship:verify:ci                   # + watch GitHub Pre-commit gate for HEAD
npm run ship:verify:e2e                  # + full-app Playwright with webServer
npm run ship:verify:all                  # --ci --e2e
npm run api:health                       # probe all /api routes (app must be running)
npm run api:health:json                  # same as JSON report
npm run biointel -- api agent            # free-API agent policy (timeouts/retries — not LLM facts)
npm run biointel -- api health [live]    # route inventory (live → BIOINTEL_BASE or prod default)
# Live SLO (post-deploy sample): BIOINTEL_BASE=<prod-url> npm run api:health -- --single-fixture --timeout=25000 --ai-wire-only
# Targets: high DATA%; category/gene may return 200 partial (_timeout) under load instead of hanging
npm run export:api-sources               # regenerate free-API name/docs/endpoint manifest
npm run test:e2e:fixture                 # north-star + data-hub e2e (needs npm run dev, E2E_FIXTURE=1)
npm run test:e2e:fixture:auto            # same + Playwright starts next dev (E2E_WEBSERVER=1)
npm run test:e2e:live                    # north-star e2e against live APIs (optional)
npm run logs:tail                        # last lines of today's agent activity JSONL
npm run biointel -- help                 # product CLI v0 for agents (see below)
npm run lint
npm run build
```

### Pre-commit gate (agents)

Run **`npm run test:precommit`** before committing product behavior changes:

1. `tsc --noEmit` + **`next lint`** (same errors that fail production `next build`)
2. **Full-app** inventory (`__tests__/fullApp/*`): every category card resolves, empty-mount smoke, Panel chrome, API/AI provenance, diagnostics, chrome testids/routes
3. Brittleness suites (`reactSafe`, ExpandableItems, CrossSourceStrip, DataHubLedger, UniProt nested DTOs)
4. Of-record product suites (Discover scores, packs, data hub builders, events, research catalog)
5. Catalog completeness (`fullApp/01-inventory`)

Optional: `npm run test:precommit:full` · `npm run test:e2e:full-app:auto` (routes + smoke with webServer) · `npm run test:e2e:fixture:auto` (north-star). Free-API fields in JSX: use `safeDisplayString` (`src/lib/reactSafe.ts`) to avoid React error #31.

**Husky** runs `test:precommit` on every `git commit` (install via `npm install`). Escape hatch: `SKIP_PRECOMMIT=1 git commit …` — **agents must not use SKIP_PRECOMMIT** unless the user explicitly orders it. **CI:** `.github/workflows/precommit.yml` on push/PR; nightly e2e: `e2e-nightly.yml`.

**Catalog law:** every `CATEGORIES` panel id must have `panelSources` (`api` + `docs`). No allowlist — add ENTRIES when you add a card.

---

## Ship protocol (agents — non-negotiable when user asks to commit / push / deploy)

Goal: never leave main red, and never claim “CI / e2e green” without proof.

### Mandatory sequence

```text
1. Implement + self-check (tsc / targeted jest)
2. npm run test:precommit          # or rely on husky at commit — still must pass
3. git commit …                    # husky blocks on gate failure
4. git push origin <branch>        # confirm user wants push / main
5. Prove CI (see below)            # REQUIRED before saying “green”
6. Rollout                         # App Hosting auto on main; only force if user asks
```

### Prove CI green (do not invent)

After push, agents **must** verify with the GitHub CLI (or UI) — never assume success from a previous run:

```text
# Preferred one-liner after push (watches Pre-commit gate for current HEAD):
npm run ship:verify:ci

# Or manually:
gh run list --branch main --limit 5
gh run watch <run-id> --exit-status    # must exit 0
# On failure: gh run view <run-id> --log-failed → fix → commit → push → watch again
```

**Rules of evidence**

| Claim | Required proof |
|--------|----------------|
| “Precommit passes” | `npm run test:precommit` exit 0 (or husky commit succeeded) |
| “Pushed” | `git status` shows in sync with `origin/...` (or push output `main -> main`) |
| “CI green” | `gh run watch … --exit-status` **0** for **this** commit’s Pre-commit gate |
| “E2E green” | Playwright exit 0 for the suite claimed, or nightly workflow success for that SHA |
| “Rolled out” | App Hosting / Firebase rollout check success for that SHA (or user-confirmed) |

Do **not** cite an older green run while HEAD has newer failed runs. List runs for the **current SHA**.

### When to run e2e before push

Run **`npm run test:e2e:full-app:auto`** (or `npm run ship:verify:e2e`) when the change touches:

- Profile chrome (loading overlay, Cite/Share/Export, copilot FAB)
- Data hub / cross-source strip / empty toggles
- Smoke routes (`e2e/smoke.spec.ts`, `full-app-surface`, `data-hub-coverage`)
- `playwright.config.ts` / e2e selectors / `data-testid`s used by e2e

Nightly workflow alone is **not** enough to claim e2e safety for a same-day UI ship — trigger it or run locally:

```text
gh workflow run "E2E full-app (nightly)" --ref main
gh run list --workflow e2e-nightly.yml --limit 3
gh run watch <id> --exit-status
```

### Rollout (App Hosting)

- Pushes to **main** trigger App Hosting build for backend **biointel** (see `docs/firebase.md`)
- Agents do **not** force `apphosting:rollouts:create` unless the user asks
- Env/secret changes: `npm run firebase:apphosting:env` / `…:env:rollout` only with user intent
- After main push, confirm rollout if user cares about production: Firebase console or `gh`/Firebase CLI status — do not invent “deployed”

### Ship helper scripts

```text
npm run ship:verify           # local precommit gate + git hygiene hints
npm run ship:verify:ci        # + wait for GitHub Pre-commit gate on HEAD (must be pushed)
npm run ship:verify:e2e       # + Playwright full-app with webServer
npm run ship:verify:all       # --ci --e2e
```

Implementation: `scripts/ship-verify.js` (pairs with `scripts/precommit-gate.js`).

### Anti-patterns (do not)

- `SKIP_PRECOMMIT=1` to “just land it”
- `git commit` then push without watching CI when the user asked for a green ship
- Claiming e2e green from a **previous** successful nightly while the latest dispatch failed
- Force-push / `--no-verify` without explicit user order
- Partial “tsc only” as a substitute for `test:precommit`

## BioIntel CLI v0 (agents / operators)

Zero-dep CLI wrapping free APIs + repo gates. App must be running for HTTP commands (`npm run dev`).

```text
npm run biointel -- help
npm run biointel -- law
npm run biointel -- health
npm run biointel -- tools list
npm run biointel -- tools playbook disease_to_shortlist
npm run biointel -- tools suggest --goal evidence --cid 2244
npm run biointel -- tools suggest --goal discover --q "NSCLC" --targets EGFR
npm run biointel -- tools copilot
npm run export:research-catalog   # regenerate CLI JSON from TS after catalog edits
npm run biointel -- discover rank --q "ATTR amyloidosis" --targets TTR
npm run biointel -- molecule get 3080836
npm run biointel -- molecule category 3080836 pharmaceutical
npm run biointel -- research kit --cid 2244 --out kit.json
npm run biointel -- logs tail --n 30
npm run biointel -- logs grep product.discover
npm run biointel -- gate
npm run biointel -- e2e auto
```

**Research tools (humans + agents):** `/how-it-works#tools` — UI/CLI/copilot catalog + scientific playbooks. Code: `src/lib/methods/researchToolCatalog.ts`. Prefer playbooks over ad-hoc thrash when accelerating discovery → evidence → pack → RH loops.

- Implementation: `scripts/biointel-cli.js` (also `bin.biointel`)
- Base URL: `BIOINTEL_BASE` or `http://localhost:33424`
- Full cookbook: `docs/design/agentic-workflow-cli.md` §3 + §CLI

## Firebase (optional cloud)

- Config: `docs/firebase.md`, `firebase.json`, `apphosting.yaml` (backend **biointel**)
- Client: `src/lib/firebase/*` — Auth optional; app works fully without cloud
- Secrets: Admin SDK JSON gitignored; web keys via `NEXT_PUBLIC_FIREBASE_*` in `.env`
- Deploy rules: `npm run firebase:deploy:rules`
- **Do not** make Firestore/RTDB required for Discover → pack loop (solo local default)

## Agent activity logs (local)

- Written to `logs/agent-activity-YYYY-MM-DD.jsonl` (gitignored; see `logs/README.md`)
- Product events, fetch outcomes (dev), profile cache hit/miss
- Disable: `NEXT_PUBLIC_AGENT_LOG=0` and/or `AGENT_ACTIVITY_LOG=0`
- Force: `NEXT_PUBLIC_AGENT_LOG=1` + `AGENT_ACTIVITY_LOG=1`

PowerShell note: chain sequential commands with `;` when the harness does not support `&&`. Prefer `rg` / repo search tools over PowerShell brace globs.

## Measurement contracts (v2.1)

- Pack props dual-read: `count`|`claimCount` and `citable`|`citableCount`
- M7: `discover_rank_completed.ms` only — exclude `harvest_safety_done` from P50/P95
- M1 completedLoops: temporal join (see `discovery-workbench-v2.1` §5.1)
- `selectPackCandidates`: multi-partition fill after V21-03 (not exclusive promote-only tier)

## Git

- Prefer **main** when the user asked for main-only; no branch sprawl by default
- Commit messages: complete sentences explaining *why*
- After **push**, follow **Ship protocol** above — precommit alone is not “CI green”
- PowerShell: chain with `;` not `&&` when the shell does not support `&&`

## Do NOT

- Add paid APIs, biologics-first entity models, de novo gen chem, multi-tenant cloud DB requirements
- Reintroduce free-form Discover ranking AI
- Dual-emit legacy product event *names* without a design revision
- Full 15-panel fetch for board pack density
- Re-plumb download→IDB (already in `PackBuilder.registerSideEffects`)
- Write exploits, malware, or attack scripts
- Invent regulatory claims or “this drug works” predictions
- Hardcode timeout/retry/status/rate-limit checks in new `src/lib/api/*` clients — use `freeApiAgent` / `timedFetch` / `moleculeLeafGet` (etiquette is agent-owned)
- Use LLM to invent panel rows or of-record facts (agent policy ≠ generative evidence)
- Burst bare `fetch` to free hosts without `timedFetch` / rateLimit (bypasses etiquette)
