# Free-API Agent runtime

**Status:** implemented (policy agent + etiquette)  
**Date:** 2026-08-03  

## Problem

Hardcoding timeout / retry / empty / status / rate-limit handling in every `src/lib/api/*` file does not scale (100+ clients) and drifts on App Hosting. Stampeding free APIs causes 429s and empty panels.

## Solution (product-law safe)

Delegate **policy + etiquette** to one agent runtime — **not** LLM invention of facts.

| Layer | Role | LLM? |
|-------|------|------|
| **freeApiAgent** | Timeout, abort, retry, fallback, empty, status, source slots | **No** |
| **timedFetch / freeApiJson** | Host rate limit, User-Agent, 429 Retry-After | **No** |
| **rateLimit** | Token-bucket + concurrency + cooldown per host | **No** |
| **leafRouteAgent** | Standard molecule `[id]` route envelope | **No** |
| **Copilot agentLoop** | Optional: choose *which* tools to call | Yes (claim-bound tools only) |
| **Discover rank** | Deterministic scores | **Never** |

Of-record evidence still comes only from free public HTTP APIs.

## Free-API etiquette (agent-owned)

The agent’s job is to **obey free-API norms** so we do not fall into rate limits:

1. **Polite User-Agent** (+ optional `From` / `NCBI_EMAIL`) — `freeApiEtiquette.politeHeaders`
2. **Per-host token bucket + max concurrency** — `acquireRateLimit` / `timedFetch`
3. **Source-level slots** on `freeApiAgent` (e.g. only N concurrent mesh tasks)
4. **429 / 503 → Retry-After cool-down** — `noteRateLimitFromResponse`
5. **Exponential backoff with full jitter** on retries — `etiquetteBackoffMs`
6. **`freeApiJson` default retries=2** so temporary 429s recover without client code

Clients should **not** re-implement sleeps or 429 parsers. Use:

- `timedFetch` / `timedFetchJson` for raw HTTP  
- `freeApiJson` for agent-managed JSON GET  
- `freeApiAgent` for multi-step parse work  

## API

```ts
import { freeApiAgent, freeApiJson } from '@/lib/api/freeApiAgent'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'
import { timedFetch } from '@/lib/api/timedFetch'

// JSON with etiquette + 429 retries
const r = await freeApiJson('openalex', 'https://api.openalex.org/works?search=aspirin')

// Multi-step under agent
const mesh = await freeApiAgent({
  source: 'mesh',
  empty: [],
  timeoutMs: 8000,
  retries: 1, // one etiquette backoff on 429
  run: async ({ signal }) => {
    const res = await timedFetch(url, { signal }) // rate-limited + UA
    /* parse */
  },
})

// Route
export async function GET(req, { params }) {
  return moleculeLeafGet(req, params, 'meshTerms', (name) => getMeshTermsByName(name))
}
```

## CLI / agents

```text
npm run biointel -- api agent
# prints policy + etiquette + inventory commands
```

Live inventory remains `api:health` (declarative probe list from App Router files).

## Do not

- Use LLM to fabricate panel rows  
- Per-file reimplement timeout/retry/rate-limit once freeApiAgent exists  
- Put LLM on Discover rank path  
- Burst fan-outs without going through timedFetch / freeApiAgent (bypasses etiquette)  
