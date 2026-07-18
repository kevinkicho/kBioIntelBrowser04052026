# Implementation Plans

> **Caution (2026-07):** These plans predate Discovery Workbench v2 / v2.1. The **active product law and PR plan** live in `docs/design/discovery-workbench-v2.1.md` and root `AGENTS.md`. Do **not** implement these plans wholesale without re-validating against product law (free APIs only, no LLM ranking, ResearchHypothesis ≠ set-ops `/hypothesis`, claim-bound AI only on packs/RH). Several items are partially overtaken by shipped work.

Forward-looking idea sketches for BioIntel Explorer. Each plan is **self-contained** — a future contributor should re-scope against current main before coding.

| #  | Plan                                                                  | Effort   | Why it matters |
|----|-----------------------------------------------------------------------|----------|----------------|
| 01 | [Hypothesis builder](01-hypothesis-builder.md)                        | ~5 days  | Cross-entity reasoning unlocks novel science |
| 02 | [Citation & reproducibility export](02-citation-export.md)            | ~3 days  | Turns the app from a *browser* into a *research instrument* you can cite |
| 03 | [Cohort comparison (5–10 molecules)](03-cohort-comparison.md)         | ~3 days  | Pipeline triage and SAR workflows |
| 04 | [Analytics-driven UX](04-analytics-driven-ux.md)                      | ~2 days  | Use telemetry we already collect to harden the app |
| 05 | [Test infrastructure cleanup](05-test-infrastructure-cleanup.md)      | ~2 days  | 75/230 suites red on baseline — silent regression risk |
| 06 | [AI tasks beyond summarization](06-ai-beyond-summarization.md)        | ~4 days  | Local Ollama can do far more than per-entity summaries |
| 07 | [Shareable links & embed widget](07-shareable-links-embed.md)         | ~2 days  | Reach: profiles drop into Slack messages, papers, lectures |

## Suggested ordering

```
05  →  04  →  02  →  01  →  03  →  06  →  07
```

- **05 first** — every other change relies on tests as a safety net. Without restoring the suite, we're flying blind.
- **04 second** — analytics-driven tuning makes everything that follows faster and more reliable.
- **02 third** — citation export is small, high-leverage, and needed by snapshot links in #07.
- **01, 03, 06** — the science-impact features, in order of how much they leverage what already exists.
- **07 last** — once snapshots (from #02) and citations exist, sharing becomes a natural finishing layer.

## Plan structure

Each plan contains:

- **Why** — the user value, in plain language
- **Scope (v1)** — what's in vs. out for the first cut
- **Approach** — key technical decisions and what we're reusing
- **File-level changes** — concrete starting points
- **Risks & open questions** — things to watch out for
- **Effort** — rough day-level estimate
- **Acceptance** — how we know it's done

Estimates assume one engineer (human or Claude) working with full repo context, no parallelization across plans.
