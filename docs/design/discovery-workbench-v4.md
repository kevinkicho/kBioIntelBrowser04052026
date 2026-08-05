# BioIntel Discovery Workbench v4 — Ambitious finish-rate OS

**Product:** BioIntel Discovery Workbench  
**Status:** Active plan + initial ship (2026-08-05)  
**Predecessor:** `discovery-workbench-v3.md` (implemented)  
**Constraint law (binding):** Free public APIs only · evidence-first · no regulatory decision support · solo + file export default · **deterministic Discover rank (no LLM)** · AI claim-bound / non-of-record only  

## 0. North star (unchanged)

> When a bioengineer opens BioIntel, they leave with a shortlist they trust, a cited pack, a written hypothesis, and a concrete Monday experiment — not a pile of panels.

v4 optimizes **finish rate and open-science honesty**, not encyclopedia breadth.

## 1. Industry signal (research, 2025–2026)

Trends that inform v4 **without** breaking product law:

| Signal | Implication for BioIntel |
|--------|--------------------------|
| Open Targets / open public multi-omics APIs | Keep free-API of-record depth; etiquette + honest empties |
| Open-source pharma + open science (negative results) | Surface not-retrieved / sparse bags as first-class honesty |
| AI life-science agents (claim-bound tools, not free invent) | Optional AI only on packs/RH/copilot; never of-record rank |
| Tougher economics → early triage value | Finish-rate loop coach + of-record decision briefs |
| Integrated workspace over tool thrash | Campaign + golden path + Monday handoff, not more panels |

**Explicit non-goals remain:** paid DBs, LLM of-record ranking, de novo gen chem as product core, multi-tenant cloud required for loop, clinical/regulatory DS language.

## 2. Ambitious v4 goals

| ID | Goal | Ship surface |
|----|------|--------------|
| **V4-01** | Loop finish-rate OS | `LoopCoachStrip` + M1 funnel strip |
| **V4-02** | Of-record decision brief | `decisionBrief.ts` + PackBuilder export (no LLM) |
| **V4-03** | Honest EMPTY free-API | `_emptyHonest` / `_notRetrieved` on category + pipeline; health counts as DATA |
| **V4-04** | Rollout proof | `npm run ship:rollout` → App Hosting status + `/campaign` probe |
| **V4-05** | Golden path OS | already: applyGoldenPath + campaign run |
| **V4-06** | Monday handoff OS | already: mondayHandoff + library |
| **V4-07** | Refuse breadth | `docs/design/refuse-breadth.md` — enforced by culture + review |

## 3. Success metrics

| Metric | Stretch |
|--------|---------|
| M1 | Completed loop rate (coach drives next step) |
| M3 | Median citable ≥5 on pack_export |
| M7 | Rank P50 cheap path |
| M-API | DATA% including partial + empty-honest 200s |
| M-Finish | Loop coach progress → 100% in a single sitting |

## 4. Non-goals (repeat)

- GPT-Rosalind-style free-form invention over free APIs  
- Paid proprietary compound DBs  
- Auto-apply AI board status  
- Regulatory authorization advice  

## 5. Implementation notes

Prefer pure builders + solo localStorage + free public HTTP. Every new of-record row names a free source. AI remains claim-bound and labeled non-of-record.
