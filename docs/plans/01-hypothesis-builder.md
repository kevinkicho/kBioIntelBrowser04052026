# 01 — Hypothesis Builder

## Why

The app surfaces molecule, gene, and disease data in three separate detail pages. The most interesting research questions live in their **joins**:

> "Which druggable genes are linked to Alzheimer with at least one active phase-2 trial?"
> "Which approved oncology drugs hit a kinase that's also implicated in autoimmune disease?"

Today, answering these means opening three pages, mentally cross-referencing, and giving up. A hypothesis builder lets the user stack 2–3 entity filters and get the intersection in one place. **No new APIs are required** — only client-side composition over data already fetched.

## Scope (v1)

- New page at `/hypothesis`
- 3 stackable filter slots — each picks an **entity type** (molecule / gene / disease) plus an **attribute** (e.g., trial phase, target class, indication, MeSH term)
- Result list of entities matching all filters with:
  - Entity name + type icon
  - Why it matched (one line per filter)
  - Click-through to the existing detail page
- Save current filter combination as a named "hypothesis" (`localStorage`, like favorites)
- Export results as CSV/JSON

**Out of scope for v1:** natural-language → filter conversion (that's plan #06), graph visualization (use the existing graph view), saved hypotheses synced across devices, statistical significance scoring.

## Approach

A `Discover`-style page that runs on demand:

1. Each filter slot is a small typed-attribute picker (e.g., `gene.symbol`, `disease.mesh-term`, `molecule.atc-class`)
2. Submitting fans out to the existing category APIs and intersects locally in a pure function
3. Results are scored by match strength (exact > substring > fuzzy)
4. Background re-cache: if a filter is reused, hit the existing cache layer first

**Reuse:**
- `discover/` page patterns (already a multi-axis search surface)
- `categoryFetchers/` to pull data
- `Panel` (now with `empty` prop) for results
- `panelSources.ts` to label why each entity matched

## File-level changes

- `src/app/hypothesis/page.tsx` — server entry, sets up suspense boundary
- `src/app/hypothesis/HypothesisClient.tsx` — client logic, filter state
- `src/components/hypothesis/FilterSlot.tsx` — entity-type + attribute picker
- `src/components/hypothesis/ResultsPanel.tsx` — paginated list with match reasons
- `src/lib/hypothesis/intersect.ts` — pure function: `intersectEntities(filters: Filter[]): MatchedEntity[]`
- `src/lib/hypothesis/types.ts` — `Filter`, `MatchedEntity`, `MatchReason`
- `src/lib/hypothesis/savedHypotheses.ts` — localStorage CRUD
- Add `/hypothesis` to `NAV_LINKS` in `src/app/page.tsx`

## Risks & open questions

- The intersection space can be huge for loose filters → enforce a top-N cutoff (e.g., 200) with "narrow your filters" hint
- Some filter axes need data we don't currently fetch eagerly (e.g., trial phase by gene). We may need to extend a category fetcher or add a focused new endpoint
- Cold-cache performance: the first hypothesis run could fan out to 30+ APIs. Need progressive rendering ("matching molecules so far: 47…")
- UX question: "saved hypothesis" — dropdown on homepage? dedicated section on `/hypothesis`?

## Effort

**~5 days.**

| Day | Work |
|-----|------|
| 1   | Page scaffold + filter UI + entity-type picker |
| 2   | Intersect engine + types + a handful of attributes (proof of concept) |
| 3   | Results polish + match-reason rendering + scoring |
| 4   | Save/load hypotheses + export |
| 5   | Edge cases, perf tuning for large intersections, tests |

## Acceptance

- User can compose 3 filters and submit
- Result list shows entities that match all filters, with one line of evidence per filter
- Click-through navigates to the right detail page (molecule/gene/disease)
- Saved hypotheses survive a page reload
- CSV/JSON export round-trips cleanly
- Existing tests still pass; new pure intersect logic has unit tests
