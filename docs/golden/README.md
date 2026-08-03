# Golden disease / molecule fixtures (v3 E4)

Of-record **demo and CI** anchors for the beachhead. Use free public APIs only; never invent associations.

| ID | Disease / use | Suggested targets | Example CID | Notes |
|----|---------------|-------------------|-------------|--------|
| `attr` | ATTR amyloidosis | TTR | 3672 (tafamidis-class exploration) | Rare + repurposing story |
| `egfr-nsclc` | EGFR-driven NSCLC framing | EGFR | 176870 (gefitinib class) | Dense public chem + trials |
| `cf` | Cystic fibrosis | CFTR | — | Orphanet gene pins |
| `t2d` | Type 2 diabetes mellitus | INS, GLP1R | 2244 (aspirin only as control empty gene) | High public density |
| `aspirin-control` | Small-molecule control | — | **2244** | Gene leaves often EMPTY (expected) |

## Files

- `rank-attr-like.json` — shape reference under `__tests__/fixtures/discovery/`
- `kit-aspirin-smoke.json` — minimal kit quality smoke expectations

## Agent rule

When claiming “golden path green”, run fixture north-star e2e (`E2E_FIXTURE=1`) and/or `research kit --cid 2244` — do not invent pack density from empty sessions.
