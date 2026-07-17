# AGENTS.md — BioIntel Discovery Workbench

Coding agents and human implementers: read this before changing product behavior.

## Product law (non-negotiable)

- Free public APIs only (no paid DBs / keys as product requirements)
- Evidence-first; no regulatory decision support language
- Solo + file export default (localStorage / IDB / download); share optional
- Deterministic ranking; never put LLMs in the rank path
- AI only claim-bound on packs / research hypotheses (no free-form Discover Why AI)
- Canonical product events only — do not reintroduce dual-emit aliases
- Board packs: 5 extractor panels max; preserve claim `subjectCandidateId`

## Canonical docs

- `docs/design/discovery-workbench-v1.md` — product law, metrics M1–M9, beachhead
- `docs/design/discovery-workbench-v2.md` — loop-completion redesign (shipped)
- `docs/design/discovery-workbench-v2.1.md` — post-v2 hardening + measurement (active plan)
- `docs/design/profile-revisit-cache.md` — search-history reopen: session cache (shipped) + IDB durability (Phase B)
- `docs/design/agentic-workflow-cli.md` — full CLI cookbook, playbooks, API surfaces

## Canonical code areas

- Discover: `src/app/discover/**`, `src/lib/discovery/**`
- Projects / packs / RH: `src/lib/project/**`, `src/components/evidence/**`
- Events: `src/lib/productEvents.ts`
- Extractors: `src/lib/evidence/extractAll.ts`
- Search history sidebar: `src/lib/searchHistory.ts`, `src/components/layout/SearchHistorySidebar.tsx`
- Profile revisit cache: `src/lib/profileClientCache.ts`, `src/lib/profileRevisitIdb.ts`, `src/lib/fetchCategory.ts`

## Commands

```text
npm run dev                              # required before e2e (no Playwright webServer by default)
npx tsc --noEmit
npm test
npm run test:gate                        # tsc + key jest suites (v2.1)
npm run test:e2e:fixture                 # north-star e2e (needs npm run dev, E2E_FIXTURE=1)
npm run test:e2e:fixture:auto            # same + Playwright starts next dev (E2E_WEBSERVER=1)
npm run test:e2e:live                    # north-star e2e against live APIs (optional)
npm run logs:tail                        # last lines of today's agent activity JSONL
npm run biointel -- help                 # product CLI v0 for agents (see below)
npm run lint
npm run build
```

## BioIntel CLI v0 (agents / operators)

Zero-dep CLI wrapping free APIs + repo gates. App must be running for HTTP commands (`npm run dev`).

```text
npm run biointel -- help
npm run biointel -- law
npm run biointel -- health
npm run biointel -- discover rank --q "ATTR amyloidosis" --targets TTR
npm run biointel -- molecule get 3080836
npm run biointel -- molecule category 3080836 pharmaceutical
npm run biointel -- logs tail --n 30
npm run biointel -- logs grep product.discover
npm run biointel -- gate
npm run biointel -- e2e auto
```

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

## Do NOT

- Add paid APIs, biologics-first entity models, de novo gen chem, multi-tenant cloud DB requirements
- Reintroduce free-form Discover ranking AI
- Dual-emit legacy product event *names* without a design revision
- Full 15-panel fetch for board pack density
- Re-plumb download→IDB (already in `PackBuilder.registerSideEffects`)
- Write exploits, malware, or attack scripts
- Invent regulatory claims or “this drug works” predictions
