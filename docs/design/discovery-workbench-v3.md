# BioIntel Discovery Workbench v3 — Ambitious scope expansion

**Product:** BioIntel Discovery Workbench  
**Status:** Active plan + partial implementation (2026-08-03)  
**Predecessor:** `discovery-workbench-v2.1.md` (hardening shipped)  
**Constraint law (binding):** Free public APIs only · evidence-first · no regulatory decision support · solo + file export default · deterministic Discover rank (no LLM) · AI claim-bound only  

## 0. North star (unchanged)

> When a bioengineer opens BioIntel, they leave with a shortlist they trust, a cited pack, a written hypothesis, and a concrete Monday experiment — not a pile of panels.

v3 expands **scope and depth** of that loop without becoming a paid-DB encyclopedia or clinical decision tool.

## 1. Horizons

| Horizon | Theme | Intent |
|---------|--------|--------|
| **H1** | Prove depth on beachhead | Golden kits, negative evidence honesty, safety triangulation, free-API etiquette/SLO |
| **H2** | Multi-dimensional loop | Claim graph, disease spine, five-regulator card, org-as-site, campaign workspace |
| **H3** | Platform others build on | Playbooks as product UI, kit interchange v2, evidence orchestration, gene-led mode (later) |

## 2. Recommendation map → code

| ID | Recommendation | Primary code / doc |
|----|----------------|-------------------|
| A2 | Mechanistic claim graph | `hubClaimGraph.ts` (shipped); pack handoff |
| A3 | Negative evidence first-class | `negativeEvidence.ts` + hub sections |
| A5 | Safety triangulation | `safetyTriangulation.ts` → safety section |
| A6 | Monday experiment library | `mondayPack.ts` + RH (existing); playbooks |
| B3 | Disease epidemiology spine | `buildDiseaseDataHub.ts` + WHO GHO |
| B4 | Org-as-site | researchLabs + ROR/CMS (existing); playbooks |
| C1 | Five-regulator card | `fiveRegulatorCard.ts` → regulatory hub |
| D1 | Playbooks as product UI | `ResearchPlaybookTips` + expanded playbooks |
| D3 | Free-API inventory as surface | methodology + `api:health` / freeApiAgent |
| D4 | Kit interchange | research kit `schemaVersion: 2` extras |
| E1 | Citation completeness | `citationCompleteness.ts` |
| E4 | Golden diseases | `docs/golden/` + fixtures |
| F1 | Etiquette-aware fetch | `freeApiAgent` / `rateLimit` / `timedFetch` (shipped) |
| G1 | Campaign workspace | `campaignWorkspace.ts` + `/how-it-works#tools` |

## 3. Explicit non-goals (product law)

- Paid APIs / commercial depth DBs  
- LLM of-record ranking or invented molecules  
- Regulatory decision support language  
- Multi-tenant required cloud for core loop  
- Biologics-first Discover identity (panels/enrichment only)

## 4. Success metrics (stretch M*)

| Metric | Meaning |
|--------|---------|
| M1 | Completed loop rate (discover → pack → RH) |
| M3 | Citation completeness ≥ threshold on pack export |
| M7 | Cheap rank latency |
| M-API | Live inventory DATA% (partial 200s count as alive) |

## 5. Ship notes

Implementers: prefer pure hub builders + playbooks + kit extras over new paid surfaces. Every new fact row must name a free public source.

## 6. Implementation status (2026-08-03)

| Slice | Status |
|-------|--------|
| Safety triangulation + five-regulator hub | Shipped |
| Research kit v2 + v3-quality.json | Shipped |
| Campaign templates + `/campaign` UI | Shipped |
| Campaign stages from product events | Shipped (`campaignStageProgress.ts` + auto badges) |
| North-star fixture e2e hard gate | Shipped (`e2e-fixture.yml` + `ship:verify:e2e`) |
| Pack citation export gate (soft M3) | Shipped |
| Disease spine (WHO GHO samples + gene-led CTA) | Shipped |
| Gene-led Discover persona / mode | Shipped (`discoverMode`) |
| Biologics kit chapter | Shipped (`biologics-chapter.json`) |
| Free-API etiquette agent | Shipped (prior) |
