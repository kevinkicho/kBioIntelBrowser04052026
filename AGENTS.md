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
- `docs/design/agentic-workflow-cli.md` — full CLI cookbook, playbooks, API surfaces

## Canonical code areas

- Discover: `src/app/discover/**`, `src/lib/discovery/**`
- Projects / packs / RH: `src/lib/project/**`, `src/components/evidence/**`
- Events: `src/lib/productEvents.ts`
- Extractors: `src/lib/evidence/extractAll.ts`

## Commands

```text
npm run dev                              # required before e2e (no Playwright webServer by default)
npx tsc --noEmit
npm test
npm run test:gate                        # tsc + key jest suites (v2.1)
npm run test:e2e:fixture                 # north-star e2e with E2E_FIXTURE=1
npm run test:e2e:live                    # north-star e2e against live APIs (optional)
npm run lint
npm run build
```

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
