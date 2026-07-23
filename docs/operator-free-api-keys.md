# Optional free API keys (operators)

BioIntel product law: **no paid DBs / keys as product requirements**.  
These optional free keys only improve rate limits for public hosts.

| Host | Env var | Why | How |
|------|---------|-----|-----|
| openFDA | `OPENFDA_API_KEY` | Higher request quota | [openFDA API keys](https://open.fda.gov/apis/authentication/) |
| data.gov (College Scorecard) | Scorecard clients may use `DEMO_KEY` or a free [api.data.gov](https://api.data.gov/signup/) key | Directory lookups | Free signup |
| NCBI E-utilities | `NCBI_EMAIL` (recommended), `NCBI_API_KEY` (optional) | Polite + higher rate | [NCBI API keys](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/) |
| OMIM | `OMIM_API_KEY` | Gene/disorder API when enabled | Free academic registration |

**App Hosting / local:** set in `.env` / App Hosting env (never commit secrets).  
**Clients without keys:** still work; may hit public rate limits more often.

Shareable endpoint list: [`api-sources-manifest.json`](./api-sources-manifest.json)  
Regenerate: `npm run export:api-sources`
