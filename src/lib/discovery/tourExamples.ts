/**
 * GuidedTour disease example sets (prefs: tourExampleSet).
 * @see docs/design/discovery-workbench-v1.md §5.3.1 R5, PR8
 */

import type { TourExampleSetPref } from './preferences'

export interface TourDiseaseExample {
  /** Display name on the card / chip */
  name: string
  /** Query string for /disease?q= */
  query: string
  /** Short conservative hook (no marketing inflation) */
  hook: string
  kind: 'common' | 'rare'
}

/** Mixed rare + common (default) — ATTR-like / rare phenotype + diabetes/NSCLC-style */
const MIXED: TourDiseaseExample[] = [
  {
    name: 'ATTR amyloidosis',
    query: 'ATTR amyloidosis',
    hook: 'Rare TTR-related phenotype; public target and trial coverage varies.',
    kind: 'rare',
  },
  {
    name: 'Type 2 diabetes',
    query: 'type 2 diabetes',
    hook: 'Common indication with dense approved-drug and trial data.',
    kind: 'common',
  },
  {
    name: 'NSCLC',
    query: 'non-small cell lung cancer',
    hook: 'High-data oncology landscape for target-linked candidates.',
    kind: 'common',
  },
  {
    name: 'Cystic fibrosis',
    query: 'cystic fibrosis',
    hook: 'Rare Mendelian disease with well-mapped CFTR biology.',
    kind: 'rare',
  },
]

/** High-data-density indications — teaching / demos */
const COMMON_ONLY: TourDiseaseExample[] = [
  {
    name: 'Type 2 diabetes',
    query: 'type 2 diabetes',
    hook: 'First-line metabolic indication; many public candidates.',
    kind: 'common',
  },
  {
    name: 'Hypertension',
    query: 'hypertension',
    hook: 'Broad cardiovascular landscape with deep trial history.',
    kind: 'common',
  },
  {
    name: 'NSCLC',
    query: 'non-small cell lung cancer',
    hook: 'Dense oncology data for targets and mechanisms.',
    kind: 'common',
  },
  {
    name: 'Rheumatoid arthritis',
    query: 'rheumatoid arthritis',
    hook: 'Immuno-inflammatory indication with multiple drug classes.',
    kind: 'common',
  },
]

/** Rare / phenotype-first — rare-disease labs */
const RARE_ONLY: TourDiseaseExample[] = [
  {
    name: 'ATTR amyloidosis',
    query: 'ATTR amyloidosis',
    hook: 'Rare cardiomyopathy/neuropathy phenotype; TTR-focused.',
    kind: 'rare',
  },
  {
    name: 'Cystic fibrosis',
    query: 'cystic fibrosis',
    hook: 'CFTR-linked Mendelian disease; limited candidate set.',
    kind: 'rare',
  },
  {
    name: 'Gaucher disease',
    query: 'Gaucher disease',
    hook: 'Lysosomal storage disorder; enzyme-replacement context.',
    kind: 'rare',
  },
  {
    name: 'SMA',
    query: 'spinal muscular atrophy',
    hook: 'Rare neuromuscular disease with SMN-related biology.',
    kind: 'rare',
  },
]

export const TOUR_EXAMPLE_SETS: Record<TourExampleSetPref, TourDiseaseExample[]> = {
  mixed: MIXED,
  'common-only': COMMON_ONLY,
  'rare-only': RARE_ONLY,
}

export function examplesForTourSet(set: TourExampleSetPref): TourDiseaseExample[] {
  return TOUR_EXAMPLE_SETS[set] ?? TOUR_EXAMPLE_SETS.mixed
}

/** Short names for homepage “Try searching for” chips under disease mode */
export function diseaseChipLabels(set: TourExampleSetPref): string[] {
  return examplesForTourSet(set).map((e) => e.name)
}
