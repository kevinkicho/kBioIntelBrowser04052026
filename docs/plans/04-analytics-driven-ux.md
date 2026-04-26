# 04 — Analytics-Driven UX

## Why

The app already collects per-API telemetry and persists it to `data/analytics.json` (30-day TTL, 50k row cap) — but **none of it feeds back into the app's UX or tuning**. The dashboard at `/analytics` shows the data; nothing else uses it.

Two missed opportunities:

1. **Timeout tuning** is currently guess-driven. We just shipped a heuristic 8 s default and 12 s overrides; with real p95/p99 in hand we can do far better.
2. **Empty panels look identical** whether the data genuinely doesn't exist or the API has been failing for two hours. Surfacing source health turns a frustrating dead-end into useful context.

## Scope (v1)

1. **Auto-tune `API_SOURCE_TIMEOUTS` from real p95.** A script `npm run tune-timeouts` reads `data/analytics.json`, computes p95 per source, writes a JSON override file the app loads at startup.
2. **Per-source health badge** on `Panel` — "Source healthy" / "Slow today" / "Errors this hour" — pulled from a small `/api/health/[source]` endpoint.
3. **Empty-state hint enrichment** — when a panel is empty, today's message says "No data found"; add "(this API has been returning errors for 2 h — try again later)" when telemetry warrants.
4. **Surface p50/p95/p99** in the `/analytics` dashboard (the data is already computed in `getDetailedApiMetrics`; just expose it).

**Out of scope for v1:** real-time SLO dashboards, alerting, multi-tenant analytics, per-user health views.

## Approach

Telemetry already exists — the work is purely consumer-side.

- `src/lib/analytics/health.ts` — pure classifier: `healthFor(source: string): 'healthy' | 'slow' | 'errors' | 'unknown'`. Logic: errors-in-last-hour > N → `errors`; p95 > 2× baseline → `slow`; else `healthy`. Returns `unknown` if fewer than 5 recent samples
- `src/lib/analytics/timeouts.ts` — loads tuned overrides if `data/timeout-overrides.json` exists, else falls back to `API_SOURCE_TIMEOUTS` defined in `utils.ts`
- `src/components/ui/Panel.tsx` — optional `sourceHealth` prop + small badge near the source footer
- `categoryFetchers/` — surface health for each source alongside the data so the panel can render the badge
- `scripts/tune-timeouts.ts` — admin script: read JSON, write JSON, no DB or build dependency

## File-level changes

- `scripts/tune-timeouts.ts` — new admin script (run with `npx tsx scripts/tune-timeouts.ts`)
- `src/lib/analytics/health.ts` — new health classifier (pure, easily unit-testable)
- `src/lib/analytics/timeouts.ts` — new timeout loader
- Modify `src/lib/utils.ts` to source `API_SOURCE_TIMEOUTS` via the loader
- Modify `src/components/ui/Panel.tsx` — optional `sourceHealth?: 'healthy' | 'slow' | 'errors'` prop + badge
- Modify `src/app/api/health/[source]/route.ts` — small endpoint returning the health classification
- Modify `src/app/analytics/page.tsx` — add p50 / p95 / p99 columns
- `package.json` — add `"tune-timeouts": "tsx scripts/tune-timeouts.ts"` script

## Risks & open questions

- **Auto-tuning could mask a slowing API.** Bound the auto-tuned value: `min 5 s, max 15 s`. Anything above 15 s falls back to a hardcoded ceiling and logs a warning
- **Per-panel health badge could add visual noise.** Gate behind a setting initially (default off); enable it if early users find it useful
- **Daily digest** (top-5 deteriorating sources) needs a scheduler. Defer to plan #07 or use a simple cron via the `schedule` skill
- **`data/timeout-overrides.json`** should be in `.gitignore` — it's environment-specific tuning, not source

## Effort

**~2 days.**

| Day | Work |
|-----|------|
| 1   | Tuning script + timeouts loader + analytics page p50/p95/p99 columns |
| 2   | Health classifier + Panel badge + `/api/health/[source]` endpoint |

## Acceptance

- Running `npm run tune-timeouts` produces `data/timeout-overrides.json`
- Restarting the dev server picks up the new timeouts (visible via `/api/health/[source]?showTimeout=1` or similar)
- Empty panels for sources with recent errors render the enriched hint
- `/analytics` shows p50 / p95 / p99 columns in addition to avg
- Health badge renders subtly (single dot or icon) when enabled, hidden when disabled
