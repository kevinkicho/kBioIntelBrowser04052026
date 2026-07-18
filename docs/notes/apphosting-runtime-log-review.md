# App Hosting runtime log review — `biointel`

**When:** 2026-07-17 (pulled live via `gcloud logging` + service account)  
**Project:** `kbiointelbrowser04052026`  
**Backend:** App Hosting `biointel` → Cloud Run `biointel` (`us-east4`)  
**Window:** ~30d severity≥ERROR / HTTP≥400; ~14d text error-like; ~7d category latency sample  

## Method

```text
GOOGLE_APPLICATION_CREDENTIALS=*-firebase-adminsdk-*.json
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="biointel" …'
```

Raw aggregates: `docs/notes/apphosting-log-review.json`, `apphosting-log-review-deep.json`.

---

## Executive summary

| Finding | Volume (sample) | Product impact | Still relevant? |
|---------|-----------------|----------------|-----------------|
| **HTTP 502** on `GET /api/molecule/{cid}` | **5** in 30d (all CID 2244, UA “Google”) | Correct **retryable upstream** signal when PubChem fails | Yes as *upstream* risk; **not** an app bug |
| **Ollama “not available”** console spam | **~71** text lines / 14d | Optional AI path only; **noise** in Cloud Logging | Yes — **config + logging** issue on Cloud Run |
| **Category routes 200** | 30/30 sampled | Multi-source free APIs working | Good health signal |
| **Slow category** (8–20s) | 4/30 | Expected free-API fan-out; UI already async | Latency, not “errors” |
| **Cloud Function `health`** | Cold start ~3s once | Probe only | Irrelevant to product loop |
| **Widespread 500 / crash loops** | **Not observed** | — | No evidence of broken backend |

**Bottom line:** Production is **stable**. The only ERROR-severity HTTP traffic in 30 days is a handful of **PubChem-driven 502s** (crawler). The **dominant log noise** is **server-side Ollama probing `localhost:11434`** on App Hosting where no local Ollama exists, then cloud fallback also failing (missing/invalid key or cloud API response).

---

## 1. HTTP 502 — `/api/molecule/N` (still relevant, expected)

### What the logs show

- 5× `502 GET /api/molecule/2244` on 2026-07-17 ~07:15–07:41 UTC  
- Latency ~0.06s–1.3s  
- User-Agent: **Google** (likely crawler / SafeBrowsing / indexing, not interactive users)  
- Mapped in code: `PubChemUpstreamError` → **502 + `retryable: true`** (`src/app/api/molecule/[id]/route.ts`)

### Is this a bug?

**No.** This is the **correct honesty contract**: “PubChem failed; don’t pretend the molecule is missing (404).”

### Why it still happens

- Free PubChem PUG REST is rate-limited / flaky under load  
- Cold start + concurrent category stampede used to amplify this (mitigations already exist: in-flight de-dupe, process cache, client retries)  
- Bots hit identity endpoints without your UI retry path

### Fundamental mitigations (product-aligned)

| Layer | Change | Avoids re-anticipating 502 as “app broken” |
|-------|--------|-----------------------------------------------|
| **Identity** | Keep 502 semantics; never map upstream fail → 404 | Correct crawler + client behavior |
| **Serve** | Process-level cache + de-dupe (shipped) | Fewer PubChem hits per request burst |
| **Client** | `clientFetch` retries on 502 (shipped) | SPA reopen recovers without user panic |
| **Ops** | Filter logs: `httpRequest.status=502` + exclude known bots if noise | Dashboard signal stays scientific |
| **Optional** | Soft edge cache of successful identity DTOs (TTL) | Reduces bot-induced PubChem load — **do not** invent data |

Do **not** “fix” free-API 502s by returning fake molecules.

---

## 2. Ollama noise — dominant “error” text (relevant, not loop-critical)

### What the logs show

Repeated:

```text
[ai] Ollama not available at http://localhost:11434 : fetch failed
[ai/health] Ollama at http://localhost:11434 unavailable — Cannot connect to Ollama
  (cloud fallback also failed: Cannot connect to Ollama)
```

### Is this a bug?

**Partially misconfigured expectation, not a Discover/board/pack failure.**

- App Hosting containers **do not** run Ollama locally  
- Health checks still try **localhost:11434** then Ollama Cloud  
- Cloud fallback also fails → likely `OLLAMA_API_KEY` secret empty/invalid at runtime **or** cloud endpoint/auth mismatch  
- `console.log` / `console.warn` on every check **pollutes** Cloud Logging at volume

### Fundamental mitigations

| Layer | Change |
|-------|--------|
| **Env** | On App Hosting RUNTIME: set working `OLLAMA_API_KEY` + `OLLAMA_CLOUD_BASE_URL`; verify secret grant to backend `biointel` |
| **Prod default** | If `K_SERVICE` / Cloud Run detected and no local URL env, **skip localhost** — cloud-only (or “AI optional unavailable”) |
| **Health** | Cache negative health for 60–120s; **one** structured log per window, not per request |
| **Severity** | Availability misses → `info`/`debug`, not warn/error spam |
| **UI** | Keep existing “AI not available” path (already claim-bound optional) |

AI is **optional** under product law; scientific loop must not depend on Ollama.

---

## 3. Latency (8s+ categories) — relevant as UX, not “errors”

Sampled category requests: all **HTTP 200**. Some 8–9s for multi-source categories.

- Free public APIs + parallel extractors  
- Already mitigated by tiered loads, client L1/L2 revisit cache, hideEmpty  
- Further gains: aggressive empty short-circuit, stricter timeouts per source (existing `API_SOURCE_TIMEOUTS`), not “error elimination”

---

## 4. What is **not** showing up (good news)

- No Next.js crash loops / OOM kill storms in sample  
- No mass 500 on Discover rank / pack routes in sample  
- No Firestore permission denials flooding logs (Firebase is optional sync)  
- Cloud Function `health` is fine (occasional cold start)

---

## 5. Recommended comprehensive posture (so we stop “anticipating” these)

Think in **three pipelines**, not one “make logs green” project:

### A. Data-serving pipeline (free APIs)

1. **Identity gate** (`getMoleculeById`) — de-dupe + cache (done); 502 honesty (done)  
2. **Category fan-out** — per-source status in `_sourceStatus` / traces (done; panel id mapping hardened locally)  
3. **Client durability** — L1/L2 revisit cache + honest `_clientFetchedAt` (recent main)  
4. **Observability** — structured fields: `{ route, cid, source, status, ms, retryable }` instead of free-form console  

### B. Navigation pipeline

1. History = href bookmarks; payloads = profile/rank caches (by design)  
2. Discover rank cache age in UI (recent main)  
3. Do not auto re-rank on session restore (product)  

### C. Optional AI pipeline

1. Production = **cloud-only** when key present; else silent unavailable  
2. Rate-limited health; no localhost spam on Cloud Run  
3. Never put AI on rank path (law)

### Deploy hygiene

Local main is **ahead of origin** (filter/sort + trail hardening). Production App Hosting tracks GitHub — **unpushed commits do not affect runtime logs** until rollout.

---

## 6. Priority backlog — implementation status (2026-07-18)

| P | Work | Status |
|---|------|--------|
| P0 | Verify App Hosting secrets: `OLLAMA_API_KEY` grant + effective runtime | Verify on deploy |
| P1 | Skip localhost Ollama on Cloud Run; cache health; reduce log spam | **Shipped** (`ollamaRuntime.ts`, `ollama.ts`, `/api/ai/health`) |
| P2 | Structured API outcome logs (5xx / slow / retryable) | **Shipped** (`serverLog.ts` + molecule / category / rank routes) |
| P3 | Deploy current main to App Hosting | **Rollout created** (commit `4106cec`, branch main) |
| — | “Eliminate all 502s” by lying about PubChem | **Do not** |

### As-built knobs

| Env | Effect |
|-----|--------|
| `OLLAMA_API_KEY` | Cloud fallback / cloud-only health on App Hosting |
| `OLLAMA_CLOUD_BASE_URL` | Default `https://ollama.com` |
| `OLLAMA_ALLOW_LOCALHOST=1` | Allow loopback probes even on Cloud Run (debug only) |
| `K_SERVICE` | Auto-detected Cloud Run → skip localhost Ollama |

---

## Security note

Service account JSON on disk grants logging + admin. Prefer env `GOOGLE_APPLICATION_CREDENTIALS` locally; ensure JSON remains **gitignored** (already). Rotate if ever committed.
