# 03 — Cohort Comparison (5–10 molecules)

## Why

`/compare` handles **2 molecules side-by-side**. Real pipeline triage and structure-activity-relationship (SAR) work routinely needs **5–10 molecules at once**, viewed as a matrix where rows are attributes and columns are molecules.

A column-per-molecule, row-per-attribute heatmap with sort-by-variance unlocks workflows the current 2-up view can't:

- Quick triage: "of these 8 candidate analogs, which has the most favorable LogP / MW / IC50 trade-off?"
- SAR insight: "what attributes vary most across this series?"
- Pipeline overview: "for our 6 lead programs, what does the safety/efficacy landscape look like?"

## Scope (v1)

- New page `/cohort` (or extend `/compare` with a mode toggle — TBD during day 1)
- Molecule picker: build a list of 5–10 by name / CID / SMILES
- Matrix view:
  - Rows = attributes (LogP, MW, IC50 for top target, # active trials, # adverse events, …)
  - Columns = molecules
  - Cells colored by relative magnitude (heatmap, log-scale where appropriate)
  - Sort rows by variance (highlights what differs most) or by attribute name
- Save cohort as a named list (`localStorage`)
- Export matrix as CSV / JSON

**Out of scope for v1:** structural overlay viewer, statistical tests (t-test, ANOVA), per-cell drill-down with full distributions, cohort sharing.

## Approach

Two passes:

1. For each molecule, fetch the categories the cohort attributes need (reuse `fetchCategoryData`)
2. Build a flat `Attribute[]` list — each attribute knows its `extract(data) → number | string | null`

The attribute list is a curated config of ~30 attributes spanning the 9 categories. Some attributes are direct (e.g., LogP from `computedProperties`); some are computed (e.g., "min IC50 across all targets" from `chemblActivities`).

**Reuse:**
- `compare/` page structure, especially `MoleculeSearch`
- `categoryFetchers/` for the underlying fetches
- `Panel` (with new `empty` prop) for the surrounding container

**New:**
- `src/lib/cohort/attributes.ts` — registry mapping attribute keys → label, category, extractor, format
- `src/lib/cohort/buildMatrix.ts` — pure function: `buildMatrix(cohort, attributes) → Cell[][]`

## File-level changes

- `src/app/cohort/page.tsx` + `src/app/cohort/CohortClient.tsx`
- `src/components/cohort/MoleculePicker.tsx` — multi-select reusing `compare/MoleculeSearch`
- `src/components/cohort/MatrixView.tsx`
- `src/components/cohort/HeatCell.tsx`
- `src/lib/cohort/attributes.ts` — attribute registry
- `src/lib/cohort/buildMatrix.ts` — pure matrix construction
- `src/lib/cohort/savedCohorts.ts` — localStorage CRUD
- Add `/cohort` to homepage `NAV_LINKS`

## Risks & open questions

- **Fetch fan-out:** 10 molecules × 9 categories = 90 API roundtrips. Need progressive render — show molecules one column at a time as they load, not blocking the whole matrix
- **Heatmap normalization:** chemical ranges span orders of magnitude (IC50 nM → mM). Use log-scale for those, linear for percentages, categorical color for enums (e.g., trial phase)
- **Mobile:** a 10-column matrix doesn't fit small screens. v1 hides cohort on narrow viewports with a "use a wider screen" hint
- **Cache pressure:** the existing `cache.ts` MAX_ENTRIES=200. A 10-molecule cohort could push older molecules out. Consider raising the cap or LRU-tagging cohort fetches

## Effort

**~3 days.**

| Day | Work |
|-----|------|
| 1   | Attribute registry + matrix engine (pure logic, fully unit-testable) |
| 2   | UI + heatmap rendering + progressive load |
| 3   | Save/load cohorts + export + edge-case polish |

## Acceptance

- Pick 10 molecules, see a 30-row × 10-column heatmap fully populated within 15s
- Sort by variance highlights the most-differentiating attributes
- Heatmap colors are visually consistent within an attribute (log-scale for chemical ranges)
- CSV export round-trips cleanly into Excel / Google Sheets
- No regression in the existing `/compare` 2-up view
- Saved cohorts survive a page reload
