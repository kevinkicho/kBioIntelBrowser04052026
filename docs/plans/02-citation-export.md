# 02 — Citation & Reproducibility Export

## Why

Every panel already cites its source endpoint (visible in the collapsible footer), but a researcher writing a paper still has to manually compile the citation list. Without machine-readable export, BioIntel is a *browser*, not a *research instrument*.

Two complementary features turn the app into something usable in actual peer-reviewed work:

1. **Citation export** — one click → BibTeX / RIS for every source contributing to the current view
2. **Snapshot URLs** — a permalink that freezes the exact data the user is seeing right now (so a citation in a paper stays valid even when the underlying APIs change)

Together they make BioIntel **citable and reproducible**.

## Scope (v1)

- "Cite this profile" button on molecule, gene, and disease detail pages
- Emits **BibTeX** and **RIS** for every data source that contributed
- "Snapshot URL" feature:
  - Snapshot stored as a JSON blob (initially in `data/snapshots/`, mirroring `data/analytics.json`)
  - Loading a snapshot URL bypasses live API calls and renders the frozen data
- Snapshot metadata: created-at timestamp, app SHA, list of contributing APIs, optional user note

**Out of scope for v1:** DOI minting, sharing/permissions on snapshots, time-series snapshot diffs, snapshot signing.

## Approach

### Citation export

Mechanical. Each entry in `panelSources.ts` already has source/api/endpoint. Build:

```ts
formatBibtex(sources: PanelSource[], profile: { name, identifiers, accessedAt }): string
formatRis(sources, profile): string
```

Consolidate at the **organization level** (one entry per PubChem, ChEMBL, etc.) rather than one per panel — otherwise a full molecule generates 100+ citations, which is unusable.

### Snapshot URLs

- `POST /api/snapshot` with current `mergedData` + entity context → returns `{snapshotId, url}`
- `GET /api/snapshot/[id]` returns the JSON
- `/molecule/[cid]?snapshot=xyz` short-circuits live fetching in `ProfilePageClient` and uses the frozen data
- Snapshots are **content-addressed** (SHA-256 of payload) so identical state → same URL
- 30-day TTL by default; admin command to extend

## File-level changes

- `src/lib/cite/bibtex.ts` — formatter
- `src/lib/cite/ris.ts` — formatter
- `src/lib/cite/consolidate.ts` — group sources by org, deduplicate
- `src/components/profile/CiteButton.tsx` — UI with copy/download
- `src/lib/snapshot/store.ts` — JSON-on-disk store (mirror `src/lib/analytics/db.ts` pattern)
- `src/app/api/snapshot/route.ts` — `POST` handler
- `src/app/api/snapshot/[id]/route.ts` — `GET` handler
- Modify `src/app/molecule/[id]/ProfilePageClient.tsx` to read `searchParams.snapshot` and short-circuit live fetching
- Mirror snapshot loading in gene and disease clients
- Wire `CiteButton` into the profile header next to `ExportButton`

## Risks & open questions

- **Citation count:** A full molecule view contributes 100+ panels. Per-panel citations are unusable; consolidating per-org is necessary. Some orgs span categories (PubChem appears in chemical, hazards, properties) — pick the right umbrella citation
- **Snapshot capture completeness:** Snapshots must include user-driven choices (overrides, params) or they won't reproduce
- **Storage growth:** 30-day TTL keeps it bounded. For a hosted deployment, swap the on-disk store for blob storage
- **Backward compatibility:** App-version SHA stored in snapshot metadata — if a future schema change makes a snapshot un-renderable, show a graceful "this snapshot was taken with an older version" message instead of crashing

## Effort

**~3 days.**

| Day | Work |
|-----|------|
| 1   | BibTeX/RIS formatters, source consolidation, CiteButton wired in |
| 2   | Snapshot store + POST/GET endpoints + content-addressing |
| 3   | Snapshot loading in ProfilePageClient + tests + edge cases |

## Acceptance

- BibTeX export includes one entry per unique source organization, with proper org/year/URL
- RIS export validates against an EndNote import test
- `CiteButton` available on molecule, gene, and disease detail pages
- Snapshot URL renders an identical-looking page **without hitting any live APIs** (verifiable via dev tools network tab)
- Snapshot survives 30 days; older snapshots return a friendly 404 with the original entity name and a "view live" link
- App SHA captured in snapshot metadata; mismatched-version snapshots render with a banner
