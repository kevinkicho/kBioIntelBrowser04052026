/**
 * Heuristics for unified search: avoid pathway/ontology IDs being treated as
 * molecules or gene symbols (e.g. WikiPathways WP1220 → false gene redirect).
 */

/** HGNC-like symbols: letter start, alphanumeric + hyphen (case-insensitive check via upper). */
const GENE_SYMBOL_PATTERN = /^[A-Z][A-Z0-9-]{1,14}$/

/** Non-gene / non-molecule database identifiers that pollute autocomplete. */
const NON_ENTITY_ID_PATTERNS: RegExp[] = [
  /^WP\d+$/i, // WikiPathways
  /^R-HSA-\d+/i, // Reactome
  /^GO:\d+$/i, // Gene Ontology
  /^UBERON[_:]\d+$/i,
  /^CHEBI:\d+$/i,
  /^DOID:\d+$/i,
  /^EFO[_:]\d+$/i,
  /^MONDO[_:]\d+$/i,
  /^MESH:[A-Z]?\d+$/i,
  /^OMIM:\d+$/i,
  /^ENSG\d+$/i,
  /^ENST\d+$/i,
]

/** Pathway / ontology IDs that should never be molecule or gene hits. */
export function isDatabaseIdNoise(label: string): boolean {
  const t = label.trim()
  if (!t) return true
  return NON_ENTITY_ID_PATTERNS.some((re) => re.test(t))
}

/**
 * True for plausible gene symbols (TP53, BRCA1, HLA-A).
 * False for pathway IDs (WP1220), ontology IDs, and multi-word names.
 */
export function looksLikeGeneSymbol(name: string): boolean {
  const t = name.trim()
  if (!t || t.includes(' ')) return false
  if (isDatabaseIdNoise(t)) return false
  if (/^\d+$/.test(t)) return false
  // WikiPathways-style even if not pure WP\d+
  if (/^WP\d/i.test(t)) return false
  return GENE_SYMBOL_PATTERN.test(t.toUpperCase())
}

/** Drop autocomplete labels that are not usable molecule names. */
export function filterMoleculeSuggestionLabels(labels: string[]): string[] {
  return labels.filter((label) => {
    const t = label.trim()
    if (t.length < 2) return false
    if (isDatabaseIdNoise(t)) return false
    // Bare pathway-ish tokens
    if (/^WP\d/i.test(t)) return false
    return true
  })
}
