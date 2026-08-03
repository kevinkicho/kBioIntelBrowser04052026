# Free-API Agent runtime

**Status:** implemented (policy agent)  
**Date:** 2026-08-03  

## Problem

Hardcoding timeout / retry / empty / status checks in every `src/lib/api/*` file does not scale (100+ clients) and drifts on App Hosting.

## Solution (product-law safe)

Delegate **policy** to one agent runtime — **not** LLM invention of facts.

| Layer | Role | LLM? |
|-------|------|------|
| **freeApiAgent** | Timeout, abort, retry, fallback, empty, status | **No** |
| **leafRouteAgent** | Standard molecule `[id]` route envelope | **No** |
| **Copilot agentLoop** | Optional: choose *which* tools to call | Yes (claim-bound tools only) |
| **Discover rank** | Deterministic scores | **Never** |

Of-record evidence still comes only from free public HTTP APIs.

## API

```ts
import { freeApiAgent, freeApiJson } from '@/lib/api/freeApiAgent'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

// Client
const r = await freeApiAgent({
  source: 'mesh',
  empty: [],
  timeoutMs: 8000,
  run: async ({ signal }) => { /* fetch + parse */ },
  fallback: async () => [], // optional free backup
})

// Route
export async function GET(req, { params }) {
  return moleculeLeafGet(req, params, 'meshTerms', (name) => getMeshTermsByName(name))
}
```

## CLI / agents

```text
npm run biointel -- api agent
# prints policy + how to run live inventory without per-route hardcoding
```

Live inventory remains `api:health` (declarative probe list from App Router files).

## Do not

- Use LLM to fabricate panel rows  
- Per-file reimplement timeout/retry once freeApiAgent exists  
- Put LLM on Discover rank path  
