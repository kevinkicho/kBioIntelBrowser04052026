/**
 * Browse taxonomy — category metadata only.
 * No local molecule catalog: every compound is resolved live via PubChem name search.
 */

export interface Category {
  title: string
  description: string
  /**
   * Optional starter *queries* (not a DB dump). Each opens a live PubChem name lookup.
   * Keep short; omit rather than inventing fake results.
   */
  starterQueries: string[]
}

export const CATEGORIES: Record<string, Category> = {
  therapeutics: {
    title: 'Therapeutics',
    description:
      'Start from well-known drug names. Lookups hit free public APIs (PubChem) — nothing is stored as a local catalog.',
    starterQueries: ['insulin', 'metformin', 'aspirin', 'ibuprofen'],
  },
  enzymes: {
    title: 'Enzymes',
    description:
      'Common enzyme names as live search seeds. Results come from public compound databases when available.',
    starterQueries: ['amylase', 'trypsin', 'lipase', 'catalase'],
  },
  diagnostics: {
    title: 'Diagnostics',
    description:
      'Imaging / lab-related compound names as live search seeds (not a diagnostic database).',
    starterQueries: ['fluorescein', 'glucose', 'creatinine', 'bilirubin'],
  },
  reagents: {
    title: 'Research Reagents',
    description: 'Common reagent names as live PubChem lookup seeds.',
    starterQueries: ['ethanol', 'glycerol', 'DMSO', 'sodium chloride'],
  },
  industrial: {
    title: 'Industrial Biotech',
    description: 'Industrial / processing compound names as live search seeds.',
    starterQueries: ['cellulase', 'protease', 'citric acid', 'lactic acid'],
  },
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES[slug]
}
