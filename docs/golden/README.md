# Golden disease / molecule fixtures (v3 E4)

Of-record **demo and CI** anchors for the beachhead. Use free public APIs only; never invent associations.

| ID | Disease / use | Suggested targets | Example CID | Notes |
|----|---------------|-------------------|-------------|--------|
| `attr` | ATTR amyloidosis | TTR | 208901 (tafamidis-class) | Rare + repurposing; north-star e2e |
| `egfr-nsclc` | EGFR-driven NSCLC framing | EGFR | 176870 (gefitinib class) | Dense public chem + trials |
| `cf` | Cystic fibrosis | CFTR | — | Orphanet gene pins; sparse honesty |
| `t2d` | Type 2 diabetes mellitus | INS, GLP1R | 4091 (metformin) | High public density |
| `aspirin-control` | Small-molecule control | — | **2244** | Gene leaves often EMPTY (expected) |

## Files

| File | Role |
|------|------|
| `kit-attr-smoke.json` | ATTR kit / hub expectations |
| `kit-egfr-smoke.json` | EGFR-NSCLC expectations |
| `kit-cf-smoke.json` | CF rare-disease expectations |
| `kit-t2d-smoke.json` | T2D density expectations |
| `kit-aspirin-smoke.json` | Aspirin control expectations |
| `__tests__/fixtures/discovery/rank-result-attr-like.json` | Rank shape ATTR |
| `__tests__/fixtures/discovery/rank-result-egfr-like.json` | Rank shape EGFR |

Code catalog: `src/lib/golden/goldenPaths.ts` (campaign spine + CLI).

## Agent rule

When claiming “golden path green”, run fixture north-star e2e (`E2E_FIXTURE=1`) and/or `research kit --cid 2244` / example CIDs — do not invent pack density from empty sessions.
