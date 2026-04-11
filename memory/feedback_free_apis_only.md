---
name: Free APIs Only
description: Only integrate free public APIs — no paid services
type: feedback
---

**Rule:** Only integrate free public APIs. Paid services are not affordable and should be excluded.

**Why:** Budget constraints — paid APIs like Plex Knowledge Graph require subscriptions that aren't sustainable for this project.

**How to apply:**
- Before integrating any new API, verify it's free/public
- If an API requires a paid subscription or has significant usage limits behind a paywall, skip it
- APIs with free tiers (even with rate limits) are acceptable
- When researching APIs, prioritize government databases (.gov), academic sources, and open data initiatives

**Examples:**
- ✓ Acceptable: PubChem, ChEMBL, UniProt, ClinicalTrials.gov, OpenFDA — all free
- ✓ Acceptable: NCBI Entrez (free, just requires email)
- ✗ Not acceptable: Plex Knowledge Graph (paid subscription required)
- ✗ Not acceptable: Elsevier APIs, some CAS databases (paid access required)